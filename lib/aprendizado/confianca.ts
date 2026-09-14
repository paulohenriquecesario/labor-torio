/**
 * Confiança = f(n_amostras, consistência dos resultados).
 * Regra dura (requisito 55/63): nunca afirmar com n_amostras < 3 sem marcar confiança baixa.
 *
 * `consistencia` é a proporção de amostras que apontam na mesma direção do aprendizado
 * (ex: das N vezes que a hipótese foi testada, quantas validaram vs. refutaram).
 * Usa uma curva de saturação (n / (n+k)) para que confiança cresça rápido no início
 * e desacelere conforme mais amostras confirmam o padrão.
 */
export function calcularConfianca(nAmostras: number, consistencia: number): number {
  const K = 4; // amostras necessárias para atingir ~metade da confiança máxima
  const clampedConsistencia = Math.min(1, Math.max(0, consistencia));

  if (nAmostras < 3) {
    // amostragem insuficiente: teto de 0.35, mesmo com 100% de consistência
    const bruta = (nAmostras / (nAmostras + K)) * clampedConsistencia;
    return Number(Math.min(0.35, bruta).toFixed(3));
  }

  const bruta = (nAmostras / (nAmostras + K)) * clampedConsistencia;
  return Number(Math.min(0.97, bruta).toFixed(3));
}

/**
 * Recalcula confiança incrementalmente ao chegar uma nova amostra (requisito 63),
 * sem precisar rebuscar todo o histórico de evidências.
 */
export function recalcularComNovaAmostra(
  confiancaAtual: number,
  nAmostrasAtual: number,
  novaAmostraConfirma: boolean,
): { confianca: number; nAmostras: number } {
  const consistenciaAtual = nAmostrasAtual > 0 ? confiancaAtual / Math.max(consistenciaMaxima(nAmostrasAtual), 0.0001) : 0;
  const acertosEstimados = Math.round(consistenciaAtual * nAmostrasAtual);
  const novosAcertos = acertosEstimados + (novaAmostraConfirma ? 1 : 0);
  const novoN = nAmostrasAtual + 1;
  const novaConsistencia = novosAcertos / novoN;

  return { confianca: calcularConfianca(novoN, novaConsistencia), nAmostras: novoN };
}

function consistenciaMaxima(n: number): number {
  const K = 4;
  return n / (n + K);
}
