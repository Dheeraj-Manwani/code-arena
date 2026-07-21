import api from "@/lib/axios";

export interface UploadedImage {
  /** Absolute, public URL to embed in markdown. */
  url: string;
  key: string;
  contentType: string;
  bytes: number;
}

export const uploadApi = {
  /**
   * Stores an image and returns its public URL.
   *
   * Content-Type is deliberately unset: the browser has to generate it so it
   * can append the multipart boundary. Setting it by hand omits the boundary
   * and multer rejects the body.
   */
  image: async (file: File): Promise<UploadedImage> => {
    const form = new FormData();
    form.append("file", file);
    return (await api.post("/api/uploads/image", form)).data.data;
  },
};
