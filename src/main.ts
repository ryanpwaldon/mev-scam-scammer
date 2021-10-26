require('dotenv').config()
import { AppModule } from './app.module'
import { NestFactory } from '@nestjs/core'

async function bootstrap() {
  const port = process.env.PORT || 3000
  const app = await NestFactory.create(AppModule)
  await app.listen(port)
  console.log(`🌐 Running on ${process.env.NETWORK}`)
}
bootstrap()
