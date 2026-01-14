import bcrypt from "bcrypt";
import * as userRepo from "../repositories/user.repository";
import {
  InvalidCredentialsError,
  EmailAlreadyExistsError,
} from "../errors/auth.errors";
import { SignUpSchemaType, LoginSchemaType } from "../schema/auth.schema";
import { generateToken } from "../middleware/auth";

export const signUp = async (input: SignUpSchemaType) => {
  const { name, email, password, role } = input;

  const existingUser = await userRepo.getUserFromEmail(email);

  if (existingUser) {
    throw new EmailAlreadyExistsError();
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await userRepo.createUser({
    name,
    email,
    password: hashedPassword,
    role: role || "contestee",
  });

  return user;
};

export const login = async (input: LoginSchemaType) => {
  const { email, password } = input;

  const user = await userRepo.getUserFromEmail(email);

  if (!user) {
    throw new InvalidCredentialsError();
  }

  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) {
    throw new InvalidCredentialsError();
  }

  const token = generateToken(user.id);

  return { token };
};
