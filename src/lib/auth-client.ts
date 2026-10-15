"use client";

import { useCallback, useRef, useSyncExternalStore } from "react";
import { createAuthClient } from "better-auth/client";

// better-auth はサーバーで外部化している(next.config.ts)。better-auth/react を使うと、
// SSR中にそれが読む react がNext同梱のReactと別インスタンスになり useRef null で落ちるため、
// Reactでの購読はここで持つ。中身は better-auth/react の useStore と同じで、
// nanostores の atom を useSyncExternalStore で読む。
const client = createAuthClient();

type SessionAtom = typeof client.useSession;
type SessionState = ReturnType<SessionAtom["get"]>;

function useSession(): SessionState {
  const atom = client.useSession;
  const snapshot = useRef(atom.get());
  const subscribe = useCallback(
    (onChange: () => void) => {
      const emit = (value: SessionState) => {
        if (snapshot.current === value) return;
        snapshot.current = value;
        onChange();
      };
      emit(atom.get());
      return atom.listen(emit);
    },
    [atom],
  );
  const get = () => snapshot.current;
  return useSyncExternalStore(subscribe, get, get);
}

export const authClient = {
  signIn: client.signIn,
  signOut: client.signOut,
  deleteUser: client.deleteUser,
  useSession,
};
