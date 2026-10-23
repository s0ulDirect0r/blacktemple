import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { MemberError } from '@/lib/membership/errors';
import { senseActor } from '@/lib/sense/actor';
import { senseMcpServer } from '@/lib/sense/mcp';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Black Temple's MCP server (Streamable HTTP, stateless). Authenticate with an
 * agent token from Sense: `Authorization: Bearer bts_…`. Each request gets a
 * fresh server bound to that agent, so every tool call is attributed to it.
 */
async function handle(request: Request) {
  let actor;
  try {
    actor = await senseActor(request);
  } catch (error) {
    const message = error instanceof MemberError ? error.message : 'Unauthorized';
    return Response.json({ jsonrpc: '2.0', error: { code: -32001, message }, id: null }, { status: 401, headers: { 'WWW-Authenticate': 'Bearer' } });
  }
  const server = senseMcpServer(actor);
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  await server.connect(transport);
  try {
    return await transport.handleRequest(request);
  } finally {
    await server.close();
  }
}

export { handle as GET, handle as POST, handle as DELETE };
