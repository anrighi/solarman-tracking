import { readFileSync } from 'node:fs'
import { join } from 'node:path'

type Args = {
  id: string
  phase: string
  status: string
  spec: string
  repo: string
  root: string
}

function parseArgs(): Args {
  const args = process.argv.slice(2)
  const get = (flag: string) => {
    const i = args.indexOf(flag)
    if (i === -1 || i + 1 >= args.length) {
      throw new Error(`Missing ${flag}`)
    }
    return args[i + 1]
  }
  return {
    id: get('--id'),
    phase: get('--phase'),
    status: get('--status'),
    spec: get('--spec'),
    repo: get('--repo'),
    root: get('--root'),
  }
}

function tableField(content: string, field: string): string | undefined {
  const row = content
    .split('\n')
    .find((line) => line.startsWith(`| ${field} |`))
  if (!row) return undefined
  return row.split('|')[2]?.trim()
}

function featureTitle(content: string): string {
  const line = content.split('\n')[0] ?? ''
  return line.replace(/^#\s*F[\w-]+\s*—\s*/, '').trim()
}

function extractSection(content: string, heading: string, maxLines = 35): string | undefined {
  const lines = content.split('\n')
  const start = lines.findIndex((line) => line === `## ${heading}`)
  if (start === -1) return undefined

  const body: string[] = []
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i].startsWith('## ')) break
    body.push(lines[i])
    if (body.length >= maxLines) {
      body.push('', '_Truncated — see full spec._')
      break
    }
  }

  const text = body.join('\n').trim()
  return text || undefined
}

function suggestedBranch(phase: string, id: string, title: string): string {
  const phaseDir = phase === '0+' ? 'phase-0-plus' : `phase-${phase}`
  const words = title
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, '')
    .split(/\s+/)
    .filter(Boolean)
  const slug = words.slice(0, 3).join('-') || 'feature'
  return `${phaseDir}/${id.toLowerCase()}-${slug}`
}

function statusLabel(status: string): string {
  if (status === 'done') return 'Done'
  if (status === 'deferred') return 'Deferred'
  return 'To do'
}

function renderSection(title: string, body: string | undefined): string {
  if (!body) return ''
  return `## ${title}\n\n${body}\n`
}

function main() {
  const { id, phase, status, spec, repo, root } = parseArgs()
  const specPath = join(root, spec)
  const content = readFileSync(specPath, 'utf8')
  const title = featureTitle(content)
  const files = tableField(content, 'Files')
  const tests = tableField(content, 'Tests')
  const branch = suggestedBranch(phase, id, title)

  const goal = extractSection(content, 'Goal', 20)
  const acceptance = extractSection(content, 'Acceptance criteria', 25)
  const deliverables = extractSection(content, 'Deliverables', 20)
  const prerequisites = extractSection(content, 'Prerequisites', 15)

  const summary =
    goal?.split('\n').find((line) => line.trim() && !line.startsWith('|')) ??
    `Implement **${title}** (phase ${phase}).`

  const specUrl = `https://github.com/${repo}/blob/main/${spec}`
  const featuresUrl = `https://github.com/${repo}/blob/main/docs/FEATURES.md`

  const parts = [
    `## Summary\n\n${summary.trim()}\n`,
    `## Tracking\n\n| | |\n|---|---|\n| **ID** | ${id} |\n| **Phase** | ${phase} |\n| **Status** | ${statusLabel(status)} |\n| **Branch** | \`${branch}\` |\n`,
    renderSection('Goal', goal),
    renderSection('Acceptance criteria', acceptance),
    renderSection('Deliverables', deliverables),
    renderSection('Prerequisites', prerequisites),
    '## Development\n',
    files ? `- **Files:** ${files}` : '',
    tests ? `- **Tests:** ${tests}` : '',
    `- **Workflow:** branch from \`main\`, PR with \`Closes #<this-issue>\``,
    '\n## Links\n',
    `- [Full spec](${specUrl})`,
    `- [Feature registry](${featuresUrl})`,
    '\n---\n',
    `_Synced from \`scripts/github-tasks.manifest.json\` + \`${spec}\`. Keep the \`[${id}]\` title prefix._`,
  ]

  process.stdout.write(parts.filter(Boolean).join('\n'))
}

main()
