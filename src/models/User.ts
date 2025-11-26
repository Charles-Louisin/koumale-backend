import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export enum UserRole {
  CLIENT = 'client',
  VENDOR = 'vendor',
  SUPER_ADMIN = 'superAdmin'
}

export enum UserStatus {
  PENDING = 'pending',
  APPROVED = 'approved'
}

export interface IUser extends Document {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  googleId?: string;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: [true, 'Email est requis'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Format email invalide']
    },
    password: {
      type: String,
      required: function(this: IUser) {
        // Le mot de passe n'est requis que si ce n'est pas un utilisateur Google
        return !this.googleId;
      },
      minlength: [8, 'Le mot de passe doit contenir au moins 8 caractères'],
      select: false
    },
    firstName: {
      type: String,
      trim: true,
      default: ''
    },
    lastName: {
      type: String,
      trim: true,
      default: ''
    },
    googleId: {
      type: String,
      sparse: true,
      unique: true
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.CLIENT
    },
    status: {
      type: String,
      enum: Object.values(UserStatus),
      default: UserStatus.APPROVED
    }
  },
  { timestamps: true }
);

// Middleware pour hacher le mot de passe avant l'enregistrement
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: unknown) {
    const normalizedError = error instanceof Error ? error : new Error(String(error));
    next(normalizedError);
  }
});

// Méthode pour comparer les mots de passe
UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model<IUser>('User', UserSchema);
