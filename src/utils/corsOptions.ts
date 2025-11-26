import dotenv from 'dotenv';

dotenv.config();

const FRONTEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

const corsOptions = {
  origin: FRONTEND_URL,
  credentials: true, // Allow cookies to be sent
  optionsSuccessStatus: 200
};

export default corsOptions;
