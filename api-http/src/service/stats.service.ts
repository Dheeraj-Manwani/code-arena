import { Role } from "@prisma/client";
import * as statsRepo from "../repositories/stats.repository";

export const getStats = async () => {
    const stats = await statsRepo.getStats();
    return stats;
};

// export const getUserStats = async (userRole: Role) => {
//     const stats = await statsRepo.getUserStats(userRole);
//     return stats;
// };
