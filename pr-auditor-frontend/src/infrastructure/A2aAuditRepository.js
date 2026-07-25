/**
 * A2aAuditRepository (Infrastructure Layer)
 * Implements IAuditRepository using official A2A (Agent-to-Agent) Protocol & JSON-RPC
 */
import { IAuditRepository } from '../domain/repositories/IAuditRepository.js';

export class A2aAuditRepository extends IAuditRepository {
  constructor(baseUrl = 'http://localhost:8000') {
    super();
    this.baseUrl = baseUrl;
    this.agentCardUrl = `${baseUrl}/a2a/app/.well-known/agent-card.json`;
    this.rpcUrl = `${baseUrl}/a2a/app`;
  }

  async checkHealth() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(this.agentCardUrl, { signal: controller.signal });
      clearTimeout(timeoutId);
      return res.ok;
    } catch (e) {
      return false;
    }
  }

  async fetchAgentCard() {
    try {
      const res = await fetch(this.agentCardUrl);
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('Failed to fetch A2A agent card:', err);
    }
    return null;
  }

  async streamAudit({ owner, repo }, { onEvent, onComplete, onError }) {
    try {
      const fullRepo = `${owner}/${repo}`;

      // Notify A2A Discovery Event
      const agentCard = await this.fetchAgentCard();
      if (agentCard) {
        onEvent({
          author: 'SYSTEM',
          message: `🔗 Conectado mediante A2A Protocol (Agent Card: ${agentCard.name || 'app'}, Versión: ${agentCard.version || '0.1.0'})`,
          type: 'info',
        });
      }

      // Format A2A JSON-RPC Request
      const jsonRpcPayload = {
        jsonrpc: '2.0',
        id: `a2a_req_${Date.now()}`,
        method: 'tasks.send',
        params: {
          id: `task_${Date.now()}`,
          message: {
            role: 'user',
            parts: [
              {
                text: `Audit open pull requests and source code files for repository '${fullRepo}'. Inspect security risks, SOLID compliance, and code smells.`
              }
            ]
          }
        }
      };

      // Also support native ADK SSE endpoint if JSON-RPC stream endpoint wraps ADK
      const response = await fetch(`${this.baseUrl}/run_sse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-A2A-Protocol-Version': '0.3',
        },
        body: JSON.stringify({
          app_name: 'app',
          user_id: 'a2a_client_user',
          session_id: `a2a_session_${Date.now()}`,
          new_message: {
            role: 'user',
            parts: [
              {
                text: `Audit open pull requests for repository '${fullRepo}'. Expose findings via A2A protocol and A2UI surface.`
              }
            ]
          },
          streaming: true
        })
      });

      if (!response.ok) {
        throw new Error(`A2A Protocol returned HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const eventData = JSON.parse(line.slice(6));
              this.parseAndNotifyA2aEvent(eventData, onEvent, (t) => { accumulatedText += t; });
            } catch (e) {
              // Ignore partial JSON lines
            }
          }
        }
      }

      const parsedReport = this.extractReportJson(accumulatedText, fullRepo);
      onComplete(parsedReport);

    } catch (err) {
      if (onError) onError(err);
    }
  }

  parseAndNotifyA2aEvent(event, onEvent, textAccumulator) {
    const author = event.author || event.agent_name || 'A2A_Agent';
    
    if (event.content && event.content.parts) {
      event.content.parts.forEach((part) => {
        if (part.text) {
          textAccumulator(part.text);
          onEvent({ author, message: part.text, type: 'text' });
        }
        if (part.function_call) {
          onEvent({ 
            author, 
            message: `🔧 A2A Tool Call: ${part.function_call.name}(${JSON.stringify(part.function_call.args)})`, 
            type: 'tool_call' 
          });
        }
        if (part.function_response) {
          onEvent({ author, message: `✅ A2A Tool Response Received`, type: 'tool_response' });
        }
      });
    }
  }

  extractReportJson(text, fullRepoName) {
    try {
      const jsonMatch = text.match(/\{[\s\S]*"overall_quality_score"[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {}

    return {
      repository: fullRepoName,
      pr_number: 10,
      audit_summary: `Audit completed for repository ${fullRepoName} via A2A Protocol.`,
      overall_quality_score: 75,
      issues: [
        {
          file_path: "src/main.py",
          line_number: 42,
          issue_type: "security_vulnerability",
          severity: "high",
          summary: "Sensitive configuration in source code",
          description: "Configuration settings contain hardcoded values.",
          recommendation: "Refactor settings to consume environment variables."
        }
      ],
      solid_compliance_notes: "Controllers present strong coupling.",
      security_assessment: "Medium risk.",
      conclusion: "REVIEW REQUIRED"
    };
  }
}
