import React, { useState, useEffect } from 'react';
import FingerprintJS from '@fingerprintjs/fingerprintjs';
import { supabase } from './supabase';

interface Props {
  children: React.ReactNode;
}

export const LicenciaGate: React.FC<Props> = ({ children }) => {
  const [autorizado, setAutorizado] = useState<boolean>(false);
  const [cargando, setCargando] = useState<boolean>(true);
  const [claveInput, setClaveInput] = useState<string>('');
  const [errorMensaje, setErrorMensaje] = useState<string>('');
  const [dispositivoActual, setDispositivoActual] = useState<string>('');

  useEffect(() => {
    let montado = true;

    const inicializar = async () => {
      try {
        // 1. Obtener o generar huella del dispositivo con respaldo seguro
        let visitorId = localStorage.getItem('app_device_fingerprint');

        if (!visitorId) {
          try {
            const fp = await FingerprintJS.load();
            const result = await fp.get();
            visitorId = result.visitorId;
          } catch (fpErr) {
            console.warn('FingerprintJS bloqueado, usando identificador criptográfico local:', fpErr);
            visitorId = 'DEV-' + crypto.randomUUID();
          }
          localStorage.setItem('app_device_fingerprint', visitorId);
        }

        if (!montado) return;
        setDispositivoActual(visitorId);

        // 2. Comprobar si ya ingresó una licencia previamente en este equipo
        const claveGuardada = localStorage.getItem('app_licencia_key');
        if (claveGuardada) {
          await validarLicencia(claveGuardada, visitorId);
        } else {
          setCargando(false);
        }
      } catch (err: any) {
        console.error('Error durante la inicialización:', err);
        if (montado) {
          setErrorMensaje('No se pudo verificar el entorno de la aplicación.');
          setCargando(false);
        }
      }
    };

    inicializar();

    return () => {
      montado = false;
    };
  }, []);

  const validarLicencia = async (clave: string, visitorId: string) => {
    setCargando(true);
    setErrorMensaje('');

    try {
      const { data, error } = await supabase
        .from('licencias')
        .select('*')
        .eq('clave_licencia', clave.trim())
        .single();

      if (error || !data) {
        setErrorMensaje('La clave de licencia no existe.');
        localStorage.removeItem('app_licencia_key');
        setCargando(false);
        return;
      }

      if (!data.activo) {
        setErrorMensaje('Esta licencia se encuentra suspendida o vencida.');
        setCargando(false);
        return;
      }

      const dispositivos: string[] = data.dispositivos_autorizados || [];
      const limite: number = data.max_dispositivos || 1;

      // CASO 1: El equipo actual ya estaba registrado previamente
      if (dispositivos.includes(visitorId)) {
        localStorage.setItem('app_licencia_key', clave.trim());
        setAutorizado(true);
        setCargando(false);
        return;
      }

      // CASO 2: Equipo nuevo y todavía hay cupos disponibles
      if (dispositivos.length < limite) {
        const nuevosDispositivos = [...dispositivos, visitorId];

        const { error: updateError } = await supabase
          .from('licencias')
          .update({ dispositivos_autorizados: nuevosDispositivos })
          .eq('id', data.id);

        if (updateError) {
          setErrorMensaje('Error al vincular el nuevo equipo en Supabase.');
          setCargando(false);
          return;
        }

        localStorage.setItem('app_licencia_key', clave.trim());
        setAutorizado(true);
      } 
      // CASO 3: Ya se ocuparon todos los dispositivos permitidos
      else {
        setErrorMensaje(
          `Límite alcanzado: Esta licencia solo permite ${limite} terminal(es) y ya están ocupadas. Comunícate para ampliar el plan de dispositivos.`
        );
      }
    } catch (err: any) {
      console.error(err);
      setErrorMensaje('Error de conexión con el servidor de licencias.');
    } finally {
      setCargando(false);
    }
  };

  const handleActivar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!claveInput.trim()) return;
    validarLicencia(claveInput, dispositivoActual);
  };

  if (cargando) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-900 text-white font-sans">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-slate-400">Validando autorización del equipo...</p>
        </div>
      </div>
    );
  }

  if (!autorizado) {
    return (
      <div className="flex min-h-screen w-screen items-center justify-center bg-slate-950 p-4 font-sans text-slate-100">
        <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl backdrop-blur-md">
          <div className="text-center mb-6">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 mb-3">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white">Activación de Licencia</h2>
            <p className="text-xs text-slate-400 mt-1">
              Ingresa la clave única para autorizar esta terminal de trabajo.
            </p>
          </div>

          <form onSubmit={handleActivar} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Clave de Licencia
              </label>
              <input
                type="text"
                placeholder="Ej. LIC-TIENDA-01"
                value={claveInput}
                onChange={(e) => setClaveInput(e.target.value.toUpperCase())}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {errorMensaje && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300 leading-relaxed">
                {errorMensaje}
              </div>
            )}

            <button
              type="submit"
              className="w-full rounded-lg bg-blue-600 py-3 text-sm font-bold text-white transition hover:bg-blue-700 active:scale-[0.98] cursor-pointer"
            >
              Vincular y Entrar
            </button>
          </form>

          {dispositivoActual && (
            <p className="mt-6 text-center text-[11px] text-slate-500">
              Terminal ID: <span className="font-mono text-slate-400">{dispositivoActual.slice(0, 12)}...</span>
            </p>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
