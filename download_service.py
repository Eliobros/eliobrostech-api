# download_service.py
import yt_dlp
import os
import sys
from pathlib import Path
import json

class DownloadService:
    def __init__(self, output_dir="downloads"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)
        
    def download_youtube(self, url, format_type="mp4"):
        """Download do YouTube"""
        try:
            # Configurações baseadas no formato
            if format_type == "mp3":
                ydl_opts = {
                    'format': 'bestaudio/best',
                    'outtmpl': str(self.output_dir / '%(title)s.%(ext)s'),
                    'postprocessors': [{
                        'key': 'FFmpegExtractAudio',
                        'preferredcodec': 'mp3',
                        'preferredquality': '192',
                    }],
                }
            elif format_type == "m4a":
                ydl_opts = {
                    'format': 'bestaudio[ext=m4a]/best[ext=m4a]/bestaudio/best',
                    'outtmpl': str(self.output_dir / '%(title)s.%(ext)s'),
                }
            elif format_type == "wav":
                ydl_opts = {
                    'format': 'bestaudio/best',
                    'outtmpl': str(self.output_dir / '%(title)s.%(ext)s'),
                    'postprocessors': [{
                        'key': 'FFmpegExtractAudio',
                        'preferredcodec': 'wav',
                    }],
                }
            else:  # mp4 default
                ydl_opts = {
                    'format': 'best[ext=mp4]/best',
                    'outtmpl': str(self.output_dir / '%(title)s.%(ext)s'),
                }
            
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)
                title = info.get('title', 'Unknown')
                
                # Realizar download
                ydl.download([url])
                
                # Encontrar arquivo baixado
                downloaded_files = list(self.output_dir.glob(f"*{title}*"))
                if downloaded_files:
                    file_path = downloaded_files[0]
                    return {
                        'success': True,
                        'title': title,
                        'file_path': str(file_path),
                        'file_size': file_path.stat().st_size,
                        'format': format_type
                    }
                
            return {'success': False, 'error': 'Arquivo não encontrado após download'}
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def download_facebook(self, url, format_type="mp4"):
        """Download do Facebook"""
        try:
            # Configurações similares ao YouTube
            if format_type == "mp3":
                ydl_opts = {
                    'format': 'bestaudio/best',
                    'outtmpl': str(self.output_dir / '%(title)s.%(ext)s'),
                    'postprocessors': [{
                        'key': 'FFmpegExtractAudio',
                        'preferredcodec': 'mp3',
                        'preferredquality': '192',
                    }],
                }
            else:
                ydl_opts = {
                    'format': 'best[ext=mp4]/best',
                    'outtmpl': str(self.output_dir / '%(title)s.%(ext)s'),
                }
            
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)
                title = info.get('title', 'Facebook_Video')
                ydl.download([url])
                
                downloaded_files = list(self.output_dir.glob(f"*{title}*"))
                if downloaded_files:
                    file_path = downloaded_files[0]
                    return {
                        'success': True,
                        'title': title,
                        'file_path': str(file_path),
                        'file_size': file_path.stat().st_size,
                        'format': format_type
                    }
                    
            return {'success': False, 'error': 'Arquivo não encontrado após download'}
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def download_tiktok(self, url, format_type="mp4"):
        """Download do TikTok"""
        try:
            if format_type == "mp3":
                ydl_opts = {
                    'format': 'bestaudio/best',
                    'outtmpl': str(self.output_dir / '%(title)s.%(ext)s'),
                    'postprocessors': [{
                        'key': 'FFmpegExtractAudio',
                        'preferredcodec': 'mp3',
                        'preferredquality': '192',
                    }],
                }
            else:
                ydl_opts = {
                    'format': 'best',
                    'outtmpl': str(self.output_dir / '%(title)s.%(ext)s'),
                }
            
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)
                title = info.get('title', 'TikTok_Video')
                ydl.download([url])
                
                downloaded_files = list(self.output_dir.glob(f"*{title}*"))
                if downloaded_files:
                    file_path = downloaded_files[0]
                    return {
                        'success': True,
                        'title': title,
                        'file_path': str(file_path),
                        'file_size': file_path.stat().st_size,
                        'format': format_type
                    }
                    
            return {'success': False, 'error': 'Arquivo não encontrado após download'}
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def download_instagram(self, url, format_type="mp4"):
        """Download do Instagram"""
        try:
            if format_type == "mp3":
                ydl_opts = {
                    'format': 'bestaudio/best',
                    'outtmpl': str(self.output_dir / '%(title)s.%(ext)s'),
                    'postprocessors': [{
                        'key': 'FFmpegExtractAudio',
                        'preferredcodec': 'mp3',
                        'preferredquality': '192',
                    }],
                }
            else:
                ydl_opts = {
                    'format': 'best',
                    'outtmpl': str(self.output_dir / '%(title)s.%(ext)s'),
                }
            
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)
                title = info.get('title', 'Instagram_Media')
                ydl.download([url])
                
                downloaded_files = list(self.output_dir.glob(f"*{title}*"))
                if downloaded_files:
                    file_path = downloaded_files[0]
                    return {
                        'success': True,
                        'title': title,
                        'file_path': str(file_path),
                        'file_size': file_path.stat().st_size,
                        'format': format_type
                    }
                    
            return {'success': False, 'error': 'Arquivo não encontrado após download'}
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def download_spotify(self, url, format_type="mp3"):
        """Download do Spotify (apenas metadata, pois Spotify não permite download direto)"""
        try:
            # Nota: Spotify não permite download direto de músicas
            # Este é um exemplo de como seria a estrutura
            return {
                'success': False, 
                'error': 'Spotify não permite download direto de músicas protegidas por direitos autorais'
            }
        except Exception as e:
            return {'success': False, 'error': str(e)}

def main():
    """Função principal para usar como serviço"""
    if len(sys.argv) < 4:
        print(json.dumps({
            'success': False, 
            'error': 'Uso: python download_service.py <platform> <url> <format>'
        }))
        return
    
    platform = sys.argv[1]
    url = sys.argv[2]
    format_type = sys.argv[3]
    
    service = DownloadService()
    
    if platform == 'youtube':
        result = service.download_youtube(url, format_type)
    elif platform == 'facebook':
        result = service.download_facebook(url, format_type)
    elif platform == 'tiktok':
        result = service.download_tiktok(url, format_type)
    elif platform == 'instagram':
        result = service.download_instagram(url, format_type)
    elif platform == 'spotify':
        result = service.download_spotify(url, format_type)
    else:
        result = {'success': False, 'error': 'Plataforma não suportada'}
    
    print(json.dumps(result))

if __name__ == "__main__":
    main()
