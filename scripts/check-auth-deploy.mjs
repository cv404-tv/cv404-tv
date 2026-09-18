import { readFileSync } from 'node:fs';
const config = readFileSync(new URL('../wrangler.jsonc', import.meta.url), 'utf8');
if (config.includes('00000000-0000-0000-0000-000000000000')) {
  console.error('部署未开始：请先创建 cv404-accounts D1 数据库，替换 wrangler.jsonc 中的占位 ID，并按 docs/email-auth.md 完成发信与密钥配置。');
  process.exit(1);
}
