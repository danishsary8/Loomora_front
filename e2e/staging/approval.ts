import { readFileSync } from 'node:fs'
import { loadStagingApproval } from './safety'

const approvalFile = process.env.QA022_APPROVAL_FILE
if (!approvalFile?.endsWith('.local'))
  throw new Error('QA-022 requires an owner approval .local file')

export const approval = loadStagingApproval(
  JSON.parse(readFileSync(approvalFile, 'utf8')) as unknown,
  process.env,
)
