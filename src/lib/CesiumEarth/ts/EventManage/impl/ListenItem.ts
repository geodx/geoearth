import { ScopeType } from './ScopeType';

interface ListenItem {
  listenType: number,
  callback: (args: any) => void;
  scope: ScopeType
}

export type { ListenItem };
