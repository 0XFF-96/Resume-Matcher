# 简历上传与 `POST /api/analyses` 行为说明

本文档整理简历文本提取的检测顺序、HTTP 响应字段、以及前端如何向用户展示相关问题。

## 接口概览

- **路径**：`POST /api/analyses`
- **内容类型**：`multipart/form-data`
- **字段**：`jobDescription`（必填）、`resume`（可选文件）、`jobTitle`、`companyName`（可选）
- **成功**：`202 Accepted`，正文为 **CreateAnalysisAccepted**（在 OpenAPI 中定义），包含 `AnalysisSummary` 全部字段以及 **`resumeExtraction`**。

返回 **`400`** 的典型场景：

- `jobDescription` 缺失或为空（`!jobDescription`，含空字符串）
- 上传阶段失败（例如超过 10MB、multipart 字段不合法、请求体格式异常）
- 简历提取失败（例如非真实 PDF、扫描件无文本层、加密 PDF、解析异常）

当客户端上传了 `resume` 且服务端提取结果 `resumeExtraction.code !== ok` 时，服务端会直接拒绝本次分析创建（不进入异步 workflow）。

## 服务端检测顺序（`resumeExtraction`）

检测在 `artifacts/api-server/src/routes/analyses.ts` 中实现，按顺序短路；**不抛错**，最终总是得到 `{ text, extraction }`。但在创建分析接口中，若存在上传文件且 `extraction.code !== ok`，会返回 400 拒绝请求。

| 顺序 | 条件 | `resumeExtraction.code` | `ok` | 说明 |
|------|------|-------------------------|------|------|
| 1 | 未上传文件 | `no_resume_file` | `false` | 仅使用 JD |
| 2 | 文件 buffer 为空 | `empty_buffer` | `false` | 上传异常或空文件 |
| 3 | 视为纯文本（`.txt` / `.md` 或 `text/plain` / `text/markdown`）且解码后无有效字符 | `plain_text_empty` | `false` | |
| 4 | 在跳过 UTF-8 BOM 后的前 4KB 内**未**找到 `%PDF-` 签名 | `not_pdf_binary` | `false` | **不调用** `pdf-parse`，避免对非 PDF 乱解 |
| 5 | `pdf-parse` 成功但规范化后无文字 | `pdf_no_extractable_text` | `false` | 常见于纯扫描件、无文本层 |
| 6 | `pdf-parse` 抛错且错误信息像加密相关（如含 password / encrypt 等） | `pdf_encrypted` | `false` | |
| 7 | `pdf-parse` 其它错误（损坏、非真实 PDF 等） | `pdf_parse_error` | `false` | |
| — | 成功得到非空简历正文 | `ok` | `true` | |

每个 `code` 对应一条固定的 **`message`**（英文），供前端直接展示或后续做 i18n 映射。

`ok` 在 OpenAPI 中的语义为：**是否获得了非空的简历正文**（与「分析任务是否创建」无关；任务仍会创建）。

## 日志

- **pino-http**：只记录请求方法、URL、`statusCode` 等，**不包含** JSON 响应体里的 `resumeExtraction`。
- 提取异常或空结果时，服务端会使用 **`logger.warn`** 记录上下文（如 `err`、`originalname`、`mimetype`、`size`），便于排查。

## OpenAPI 与代码生成

- 规范：`lib/api-spec/openapi.yaml`
- 相关 schema：`ResumeExtraction`、`CreateAnalysisAccepted`（`allOf`：`AnalysisSummary` + 必填 `resumeExtraction`）
- 生成客户端：`pnpm --filter @workspace/api-spec run codegen`  
  产物包括 `lib/api-client-react` 中的 **`CreateAnalysisAccepted`** / **`ResumeExtraction`** 类型。

## 前端行为（`artifacts/resume-matcher`）

### 上传页（Analyze）

- 允许 **PDF** 与 **纯文本**（`.txt` / `.md` 等），与后端一致。
- 提交成功后，若 `resumeExtraction.code` 属于「需要提醒用户」的集合，则将 **`resumeExtraction.message`** 写入 **`sessionStorage`**，键名为：

  `rm_resume_extraction:{analysisId}`

  逻辑封装在 `src/lib/resume-extraction.ts` 的 **`shouldAlertResumeExtraction`**。

### 处理页（Processing）

- 进入页面时读取上述键并展示**琥珀色横幅**（可关闭），读完后 **removeItem**，避免重复提示。

以下 **`code` 会触发横幅**（与 `no_resume_file` / `ok` 区分）：

- `empty_buffer`
- `plain_text_empty`
- `not_pdf_binary`
- `pdf_no_extractable_text`
- `pdf_encrypted`
- `pdf_parse_error`

### Hook 类型

- `use-upload.ts` 中创建分析的返回类型为 **`CreateAnalysisAccepted`**，解析 JSON 时需包含 `resumeExtraction` 字段（与后端 202 一致）。

## 相关文件索引

| 区域 | 路径 |
|------|------|
| 提取与路由 | `artifacts/api-server/src/routes/analyses.ts` |
| HTTP 访问日志 | `artifacts/api-server/src/app.ts`（`pino-http` 序列化） |
| OpenAPI | `lib/api-spec/openapi.yaml` |
| 前端告警码集合 | `artifacts/resume-matcher/src/lib/resume-extraction.ts` |
| 上传与跳转 | `artifacts/resume-matcher/src/pages/Analyze.tsx` |
| 横幅展示 | `artifacts/resume-matcher/src/pages/Processing.tsx` |
| 自定义 multipart 请求 | `artifacts/resume-matcher/src/hooks/use-upload.ts` |
