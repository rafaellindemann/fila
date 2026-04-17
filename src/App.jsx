// bash 3
import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

import QueueBoard from "./components/QueueBoard";
import StudentForm from "./components/StudentForm";
import AdminPanel from "./components/AdminPanel";
import AuthForm from "./components/AuthForm";
import CadastroPerfil from "./pages/CadastroPerfil";

import { listarFilaAtiva, limparChamadoLocal } from "./services/chamados";
import { listarSessoesAtivas } from "./services/sessoes";
import { buscarUsuarioPorId } from "./services/usuarios";
import { getSession, onAuthStateChange, signOut } from "./services/auth";
import { supabase } from "./lib/supabase";

const AUTH_TIMEOUT_MS = 8000;

function timeoutPromise(ms, message) {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(message)), ms);
  });
}

function isRecoveryUrl() {
  const hash = (window.location.hash || "").toLowerCase();
  const search = (window.location.search || "").toLowerCase();
  const full = `${search}${hash}`;

  return (
    full.includes("type=recovery") ||
    (full.includes("access_token") && full.includes("refresh_token"))
  );
}

export default function App() {
  const [fila, setFila] = useState([]);
  const [sessoes, setSessoes] = useState([]);

  const [session, setSession] = useState(null);
  const [usuario, setUsuario] = useState(null);

  const [appLoading, setAppLoading] = useState(true);
  const [aba, setAba] = useState("publico");
  const [resettingSession, setResettingSession] = useState(false);

  const [bootStatus, setBootStatus] = useState("loading");
  // loading | anonymous | needs_profile | ready | recovery

  const [loadingMsg, setLoadingMsg] = useState("Carregando autenticação...");

  const authBootstrapRef = useRef(false);
  const profileRequestRef = useRef(0);

  const sessaoAtiva = useMemo(() => sessoes[0] || null, [sessoes]);
  const isAdmin = usuario?.papel === "admin";

  async function carregarTudo() {
    try {
      const [filaData, sessoesData] = await Promise.all([
        listarFilaAtiva(),
        listarSessoesAtivas(),
      ]);

      setFila(filaData || []);
      setSessoes(sessoesData || []);
    } catch (err) {
      console.error("Erro ao carregar dados da fila:", err);
    } finally {
      setAppLoading(false);
    }
  }

  async function carregarPerfilPorUserId(userId, { silent = false } = {}) {
    const requestId = ++profileRequestRef.current;

    try {
      if (!silent) {
        setLoadingMsg("Carregando perfil do usuário...");
      }

      const perfil = await buscarUsuarioPorId(userId);

      // ignora resposta velha
      if (requestId !== profileRequestRef.current) return null;

      setUsuario(perfil || null);

      if (perfil) {
        setBootStatus("ready");
      } else {
        setBootStatus("needs_profile");
      }

      return perfil || null;
    } catch (err) {
      console.error("Erro ao buscar perfil do usuário:", err);

      if (requestId !== profileRequestRef.current) return null;

      // não joga para cadastro por erro transitório de leitura
      // mantém fluxo seguro
      setUsuario(null);
      setBootStatus("loading");
      return null;
    }
  }

  async function bootstrapAuth() {
    try {
      setBootStatus("loading");
      setLoadingMsg("Carregando autenticação...");

      const sessao = await Promise.race([
        getSession(),
        timeoutPromise(
          AUTH_TIMEOUT_MS,
          "Tempo esgotado ao carregar autenticação.",
        ),
      ]);

      setSession(sessao);

      if (!sessao?.user) {
        setUsuario(null);
        setBootStatus("anonymous");
        return;
      }

      if (isRecoveryUrl()) {
        setBootStatus("recovery");
        return;
      }

      await carregarPerfilPorUserId(sessao.user.id, { silent: false });
    } catch (err) {
      console.error("Erro ao carregar autenticação:", err);

      // recovery automático para sessão persistida quebrada
      limparChamadoLocal();
      limparStoragesDoSupabase();

      try {
        await signOut();
      } catch (logoutErr) {
        console.warn(
          "Falha ao limpar sessão remota durante recovery:",
          logoutErr,
        );
      }

      setSession(null);
      setUsuario(null);
      setBootStatus("anonymous");
    }
  }

  function limparStoragesDoSupabase() {
    const localKeys = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key) continue;
      localKeys.push(key);
    }

    localKeys.forEach((key) => {
      const lower = key.toLowerCase();
      if (
        lower.includes("supabase") ||
        lower.includes("sb-") ||
        lower.includes("auth-token") ||
        lower.includes("persist-session")
      ) {
        localStorage.removeItem(key);
      }
    });

    const sessionKeys = [];
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const key = sessionStorage.key(i);
      if (!key) continue;
      sessionKeys.push(key);
    }

    sessionKeys.forEach((key) => {
      const lower = key.toLowerCase();
      if (
        lower.includes("supabase") ||
        lower.includes("sb-") ||
        lower.includes("auth-token") ||
        lower.includes("persist-session")
      ) {
        sessionStorage.removeItem(key);
      }
    });
  }

  async function handleResetSessao() {
    try {
      setResettingSession(true);

      limparChamadoLocal();
      limparStoragesDoSupabase();

      try {
        await signOut();
      } catch (err) {
        console.warn("Falha ao encerrar sessão remotamente:", err);
      }

      profileRequestRef.current += 1;
      setSession(null);
      setUsuario(null);
      setBootStatus("anonymous");
      setAba("publico");

      window.location.replace(window.location.pathname);
    } catch (err) {
      console.error("Erro ao resetar sessão:", err);
      setResettingSession(false);
    }
  }

  useEffect(() => {
    if (authBootstrapRef.current) return;
    authBootstrapRef.current = true;

    bootstrapAuth();
    carregarTudo();
  }, []);

  useEffect(() => {
    const {
      data: { subscription },
    } = onAuthStateChange(async (event, sessao) => {
      console.log("Auth state mudou:", event, sessao);

      // evita reprocessar o bootstrap já tratado por getSession()
      if (event === "INITIAL_SESSION") {
        return;
      }

      setSession(sessao);

      if (event === "PASSWORD_RECOVERY") {
        setBootStatus("recovery");
        return;
      }

      if (!sessao?.user) {
        profileRequestRef.current += 1;
        setUsuario(null);
        setBootStatus("anonymous");
        setAba("publico");
        return;
      }

      if (isRecoveryUrl()) {
        setBootStatus("recovery");
        return;
      }

      // refresh silencioso
      await carregarPerfilPorUserId(sessao.user.id, { silent: true });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let ativo = true;

    const recarregar = async () => {
      if (!ativo) return;
      await carregarTudo();
    };

    const channel = supabase
      .channel("fila-realtime-global")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "fila_chamados" },
        recarregar,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "fila_sessoes" },
        recarregar,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "fila_interacoes" },
        recarregar,
      )
      .subscribe((status) => {
        console.log("STATUS REALTIME:", status);
      });

    return () => {
      ativo = false;
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const intervalId = setInterval(() => {
      carregarTudo();
    }, 5000);

    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!isAdmin && aba === "admin") {
      setAba("publico");
    }
  }, [aba, isAdmin]);

  async function handleLogout() {
    try {
      await signOut();
      limparChamadoLocal();
      limparStoragesDoSupabase();
      profileRequestRef.current += 1;
      setSession(null);
      setUsuario(null);
      setBootStatus("anonymous");
      setAba("publico");
    } catch (err) {
      console.error("Erro ao sair:", err);
    }
  }

  if (bootStatus === "loading") {
    return (
      <div className="app-shell">
        <div className="card">
          <h2>Perfil</h2>
          <p>{loadingMsg}</p>

          <div className="toolbar" style={{ marginTop: "1rem" }}>
            <button
              type="button"
              className="secondary"
              onClick={handleResetSessao}
              disabled={resettingSession}
            >
              {resettingSession
                ? "Limpando sessão..."
                : "Cancelar e voltar ao login"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (bootStatus === "recovery") {
    return (
      <div className="app-shell">
        <header className="topbar">
          <div>
            <h1>filaDoRafa.vercel.app</h1>
            <p className="muted">Defina sua nova senha para continuar.</p>
          </div>
        </header>

        <main className="main-grid">
          <AuthForm
            initialMode="redefinir"
            onPasswordResetComplete={async () => {
              window.history.replaceState(
                {},
                document.title,
                window.location.pathname,
              );
              await handleLogout();
            }}
          />
        </main>
      </div>
    );
  }

  if (bootStatus === "anonymous") {
    return (
      <div className="app-shell">
        <header className="topbar">
          <div>
            <h1>filaDoRafa.vercel.app</h1>
            <p className="muted">Entre para usar o sistema.</p>
          </div>
        </header>

        <main className="main-grid">
          <AuthForm />
        </main>
      </div>
    );
  }

  if (bootStatus === "needs_profile" && session) {
    return (
      <div className="app-shell">
        <header className="topbar">
          <div>
            <h1>filaDoRafa.vercel.app</h1>
            <p className="muted">Complete seu cadastro para continuar.</p>
          </div>

          <div className="toolbar">
            <button className="secondary" onClick={handleLogout}>
              Sair
            </button>
          </div>
        </header>

        <main className="main-grid">
          <CadastroPerfil
            sessaoAtiva={sessaoAtiva}
            onDone={async () => {
              if (session?.user?.id) {
                await carregarPerfilPorUserId(session.user.id, {
                  silent: false,
                });
              }
            }}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-brand">
          <h1>filaDoRafa.vercel.app</h1>
        </div>

        <p className="muted">
          {sessaoAtiva
            ? `sessao@ativa:~$ ${sessaoAtiva.turma?.apelido || sessaoAtiva.turma?.nome}${sessaoAtiva.titulo ? ` — ${sessaoAtiva.titulo}` : ""}`
            : "Nenhuma sessão ativa no momento"}
        </p>

        <nav className="tabs">
          <button
            className={aba === "publico" ? "active" : ""}
            onClick={() => setAba("publico")}
          >
            Painel
          </button>

          <button
            className={aba === "aluno" ? "active" : ""}
            onClick={() => setAba("aluno")}
          >
            Meu chamado
          </button>

          {isAdmin && (
            <button
              className={aba === "admin" ? "active" : ""}
              onClick={() => setAba("admin")}
            >
              Admin
            </button>
          )}

          <button className="secondary" onClick={handleLogout}>
            Sair
          </button>
        </nav>
      </header>

      <main className="main-grid">
        {appLoading ? (
          <div className="card">
            <p>Carregando fila...</p>
          </div>
        ) : (
          <>
            {aba === "publico" && <QueueBoard fila={fila} />}

            {aba === "aluno" && (
              <StudentForm onRefresh={carregarTudo} usuario={usuario} />
            )}

            {aba === "admin" && isAdmin && (
              <AdminPanel
                fila={fila}
                sessaoAtiva={sessaoAtiva}
                onRefresh={carregarTudo}
                usuario={usuario}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
