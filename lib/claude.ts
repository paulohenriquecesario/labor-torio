import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';

interface AskOptions {
  system: string;
  prompt: string;
  maxTokens?: number;
  temperature?: number;
}

/** Chamada simples de texto livre, usada por agentes que produzem markdown (relatórios, briefings, copies). */
export async function askClaude({ system, prompt, maxTokens = 4096 }: AskOptions): Promise<string> {
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    // `temperature` é rejeitado (400) pelos modelos Claude 5 — não é mais um parâmetro ajustável.
    system,
    messages: [{ role: 'user', content: prompt }],
  });

  const block = message.content.find((b) => b.type === 'text');
  return block && block.type === 'text' ? block.text : '';
}

interface AskJsonOptions extends AskOptions {
  /** JSON Schema do objeto esperado como retorno. */
  schema: Record<string, unknown>;
  schemaName: string;
}

/**
 * Chamada estruturada: força o modelo a responder através de uma tool call única,
 * garantindo JSON válido no formato do schema informado. Usado pelos agentes que
 * precisam persistir campos estruturados (padrões, hipóteses, aprendizados, parsing de métricas).
 */
export async function askClaudeJson<T = unknown>({
  system,
  prompt,
  schema,
  schemaName,
  maxTokens = 4096,
}: AskJsonOptions): Promise<T> {
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    // `temperature` é rejeitado (400) pelos modelos Claude 5 — não é mais um parâmetro ajustável.
    system,
    messages: [{ role: 'user', content: prompt }],
    tools: [
      {
        name: schemaName,
        description: `Registra o resultado estruturado de: ${schemaName}`,
        input_schema: schema,
      },
    ] as Anthropic.Messages.Tool[],
    tool_choice: { type: 'tool', name: schemaName },
  });

  const toolUse = message.content.find((b) => b.type === 'tool_use');
  if (!toolUse || toolUse.type !== 'tool_use') {
    throw new Error(`Claude não retornou tool_use para ${schemaName}`);
  }
  return toolUse.input as T;
}

export { MODEL as CLAUDE_MODEL };
