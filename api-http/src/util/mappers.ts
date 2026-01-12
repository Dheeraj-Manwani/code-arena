import { User } from "@prisma/client";
import { SessionUser } from "../schema/user.schema";

export const getSessionUser = (user: User): SessionUser => {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
  };
};
