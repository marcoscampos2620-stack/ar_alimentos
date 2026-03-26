import { supabase } from '../config/supabase';

export const storageService = {
  /**
   * Faz upload de uma imagem para o bucket especificado.
   * @param bucket Nome do bucket (ex: 'products')
   * @param folder Pasta dentro do bucket (ex: 'thumbnails')
   * @param file Arquivo a ser enviado
   * @returns URL pública da imagem
   */
  async uploadImage(bucket: string, folder: string, file: File): Promise<string> {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
      const filePath = `${folder}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error: any) {
      console.error('Error uploading image:', error);
      throw new Error(`Falha no upload da imagem: ${error.message}`);
    }
  },

  /**
   * Remove uma imagem do bucket pelo seu URL público.
   * @param bucket Nome do bucket
   * @param imageUrl URL pública da imagem
   */
  async deleteImageByUrl(bucket: string, imageUrl: string): Promise<void> {
    try {
      // Extrair o caminho do arquivo do URL
      // Ex: https://xxx.supabase.co/storage/v1/object/public/products/folder/file.jpg
      const urlParts = imageUrl.split(`/public/${bucket}/`);
      if (urlParts.length < 2) return;

      const filePath = urlParts[1];
      const { error } = await supabase.storage
        .from(bucket)
        .remove([filePath]);

      if (error) throw error;
    } catch (error: any) {
      console.error('Error deleting image:', error);
      // Não lançamos erro aqui para não travar o fluxo principal se a deleção falhar
    }
  }
};
