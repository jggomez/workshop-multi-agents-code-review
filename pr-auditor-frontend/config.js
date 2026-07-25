/**
 * Dynamic Runtime Configuration
 * Environment variable AGENT_SERVER_URL can be substituted at runtime when running in Cloud Run container.
 */
window.ENV_AGENT_SERVER_URL = window.ENV_AGENT_SERVER_URL || 'http://localhost:8000';
