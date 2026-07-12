import './config/env'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import { env } from './config/env'
import { logger } from './config/logger'
import { errorMiddleware } from './api/middlewares/error.middleware'
import routes from './api/routes/index'

const app = express()

app.use(helmet())
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true,
}))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

app.use('/api/v1', routes)

app.use(errorMiddleware)

app.listen(env.PORT, () => {
  logger.info(`Question Factory API running on port ${env.PORT}`)
})

export default app
