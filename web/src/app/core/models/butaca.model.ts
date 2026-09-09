export type TipoButaca = 'normal' | 'accesible' | 'vip';

export interface Butaca {
  id: number;
  sala_id: number;
  fila: string;
  columna: number;
  tipo: TipoButaca;
}
