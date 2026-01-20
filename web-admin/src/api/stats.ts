import api from "@/lib/axios";

export const statsApi = {
    getStats: async () => {
        const res = await api.get("/api/stats");
        return res.data;
    },
};
