import * as statsRepo from "../repositories/stats.repository";

export const getStats = async () => {
    const stats = await statsRepo.getStats();
    return stats;
};
