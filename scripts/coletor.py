#!/usr/bin/env python3
"""
Coletor de Informações de Hardware para Inventário TI

Coleta informações do sistema (hostname, OS, CPU, RAM, serial, armazenamento)
e envia para o Supabase via API REST, usando upsert para evitar duplicatas.

Requisitos:
    pip install requests wmi  (wmi é para Windows)

Configuração:
    Defina as variáveis de ambiente:
    - SUPABASE_URL: URL do projeto Supabase
    - SUPABASE_KEY: Chave anônima (anon key) do Supabase
"""

import platform
import socket
import os
import json
import subprocess
import logging
import sys

try:
    import requests
except ImportError:
    print("ERRO: Módulo 'requests' não encontrado.")
    print("Para corrigir, abra o terminal e digite: pip install requests")
    input("\nPressione Enter para sair...")
    sys.exit(1)

# Configuração do Logger
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def get_serial_number() -> str:
    """Obtém o número de série do equipamento."""
    try:
        if platform.system() == "Windows":
            result = subprocess.run(
                ["wmic", "bios", "get", "serialnumber"],
                capture_output=True, text=True, timeout=10
            )
            lines = result.stdout.strip().split('\n')
            if len(lines) >= 2:
                serial = lines[1].strip()
                if serial and serial != "To be filled by O.E.M.":
                    return serial
        elif platform.system() == "Linux":
            result = subprocess.run(
                ["sudo", "dmidecode", "-s", "system-serial-number"],
                capture_output=True, text=True, timeout=10
            )
            serial = result.stdout.strip()
            if serial and serial != "Not Specified":
                return serial
    except Exception as e:
        logger.warning(f"Não foi possível obter o serial: {e}")

    return f"AUTO-{socket.gethostname()}"


def get_cpu_info() -> str:
    """Obtém informações do processador."""
    try:
        if platform.system() == "Windows":
            # Tentar PowerShell primeiro (mais limpo)
            try:
                result = subprocess.run(
                    ["powershell", "-Command", "Get-CimInstance Win32_Processor | Select-Object -ExpandProperty Name"],
                    capture_output=True, text=True, timeout=10
                )
                if result.stdout.strip():
                    return result.stdout.strip()
            except:
                pass
            
            # Fallback para wmic
            result = subprocess.run(
                ["wmic", "cpu", "get", "name"],
                capture_output=True, text=True, timeout=10
            )
            lines = [l.strip() for l in result.stdout.splitlines() if l.strip()]
            if len(lines) >= 2:
                return lines[1]
        elif platform.system() == "Linux":
            with open("/proc/cpuinfo", "r") as f:
                for line in f:
                    if "model name" in line:
                        return line.split(":")[1].strip()
    except Exception as e:
        logger.warning(f"Erro ao obter CPU: {e}")

    return platform.processor() or ""


def get_ram_gb() -> str:
    """Obtém a quantidade total de RAM em MB (estilo systeminfo)."""
    try:
        if platform.system() == "Windows":
            # Tentar PowerShell formatado
            try:
                result = subprocess.run(
                    ["powershell", "-Command", "[math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1MB)"],
                    capture_output=True, text=True, timeout=10
                )
                if result.stdout.strip():
                    mb = int(result.stdout.strip())
                    return f"{mb:,} MB".replace(",", ".")
            except:
                pass

            # Fallback para wmic
            try:
                result = subprocess.run(
                    ["wmic", "computersystem", "get", "totalphysicalmemory"],
                    capture_output=True, text=True, timeout=10
                )
                lines = [line.strip() for line in result.stdout.splitlines() if line.strip()]
                if len(lines) >= 2:
                    total_bytes = int(lines[1])
                    mb = int(total_bytes / (1024 ** 2))
                    return f"{mb:,} MB".replace(",", ".")
            except:
                pass

            # Fallback final: systeminfo (Lento, mas muito confiável)
            try:
                result = subprocess.run(
                    ["systeminfo"],
                    capture_output=True, text=True, timeout=20
                )
                for line in result.stdout.splitlines():
                    if "física total" in line.lower() or "total physical memory" in line.lower():
                        # Ex: Memória física total: 10.116 MB
                        parts = line.split(":")
                        if len(parts) >= 2:
                            return parts[1].strip()
            except:
                pass
        elif platform.system() == "Linux":
            with open("/proc/meminfo", "r") as f:
                for line in f:
                    if "MemTotal" in line:
                        kb = int(line.split()[1])
                        mb = int(kb / 1024)
                        return f"{mb} MB"
    except Exception as e:
        logger.warning(f"Erro ao obter RAM: {e}")

    return ""


def get_storage_info() -> str:
    """Obtém informações de armazenamento."""
    try:
        if platform.system() == "Windows":
            try:
                result = subprocess.run(
                    ["powershell", "-Command", "Get-PhysicalDisk | Select-Object -ExpandProperty Size"],
                    capture_output=True, text=True, timeout=10
                )
                output = result.stdout.strip().splitlines()
                if output:
                    size_bytes = int(output[0].strip())
                    gb = round(size_bytes / (1024 ** 3))
                    if gb >= 900: return f"{round(gb / 1024)} TB"
                    return f"{gb} GB"
            except:
                result = subprocess.run(
                    ["wmic", "diskdrive", "get", "size"],
                    capture_output=True, text=True, timeout=10
                )
                lines = [line.strip() for line in result.stdout.splitlines() if line.strip()]
                if len(lines) >= 2:
                    size_bytes = int(lines[1])
                    gb = round(size_bytes / (1024 ** 3))
                    if gb >= 900: return f"{round(gb / 1024)} TB"
                    return f"{gb} GB"
    except Exception as e:
        logger.warning(f"Erro ao obter armazenamento: {e}")

    return ""


def get_os_info() -> str:
    """Obtém nome e versão do Sistema Operacional."""
    try:
        if platform.system() == "Windows":
            # Tentar via PowerShell para nome completo e versão
            try:
                result = subprocess.run(
                    ["powershell", "-Command", "((Get-CimInstance Win32_OperatingSystem).Caption + ' ' + (Get-CimInstance Win32_OperatingSystem).Version).Trim()"],
                    capture_output=True, text=True, timeout=10
                )
                if result.stdout.strip():
                    return result.stdout.strip()
            except Exception as e:
                logger.debug(f"PowerShell SO failed: {e}")
        
        system = platform.system()
        release = platform.release()
        return f"{system} {release}"
    except:
        return "Desconhecido"


def get_logged_user() -> str:
    """Obtém o usuário logado atualmente."""
    try:
        # PowerShell é mais confiável no Windows para saber quem está na sessão
        if platform.system() == "Windows":
            try:
                result = subprocess.run(
                    ["powershell", "-Command", "(Get-CimInstance Win32_ComputerSystem).UserName.Trim()"],
                    capture_output=True, text=True, timeout=10
                )
                user = result.stdout.strip()
                if user:
                    return user.split('\\')[-1]
            except Exception as e:
                logger.debug(f"PowerShell User failed: {e}")

        # Fallbacks
        try:
            return os.getlogin()
        except:
            pass
        return os.environ.get("USERNAME") or os.environ.get("USER") or "Desconhecido"
    except:
        return "Desconhecido"


def get_uptime() -> str:
    """Obtém o tempo de atividade do sistema."""
    try:
        if platform.system() == "Windows":
            # PowerShell é muito mais simples para uptime
            try:
                cmd = "(Get-Date) - (Get-CimInstance Win32_OperatingSystem).LastBootUpTime"
                result = subprocess.run(
                    ["powershell", "-Command", f"$u = {cmd}; \"$($u.Days)d $($u.Hours)h $($u.Minutes)m\".Trim()"],
                    capture_output=True, text=True, timeout=10
                )
                if result.stdout.strip():
                    return result.stdout.strip()
            except Exception as e:
                logger.debug(f"PowerShell Uptime failed: {e}")

            # Fallback para wmic
            result = subprocess.run(
                ["wmic", "os", "get", "lastbootuptime"],
                capture_output=True, text=True, timeout=10
            )
            lines = [line.strip() for line in result.stdout.strip().split('\n') if line.strip()]
            if len(lines) >= 2:
                boot_time_str = lines[1].split('.')[0]
                import datetime
                boot_time = datetime.datetime.strptime(boot_time_str, "%Y%m%d%H%M%S")
                uptime = datetime.datetime.now() - boot_time
                return f"{uptime.days}d {uptime.seconds // 3600}h {(uptime.seconds % 3600) // 60}m"
        elif platform.system() == "Linux":
            with open("/proc/uptime", "r") as f:
                uptime_seconds = float(f.readline().split()[0])
                days = int(uptime_seconds // 86400)
                hours = int((uptime_seconds % 86400) // 3600)
                minutes = int((uptime_seconds % 3600) // 60)
                return f"{days}d {hours}h {minutes}m"
    except Exception as e:
        logger.warning(f"Erro ao obter uptime: {e}")
    
    return "Desconhecido"


def collect_system_info() -> dict:
    """Coleta todas as informações do sistema."""
    hostname = socket.gethostname()
    serial = get_serial_number()

    info = {
        "nome": hostname,
        "tipo": "Computador",
        "serial": serial,
        "status": "Em uso",
        "processador": get_cpu_info(),
        "memoria_ram": get_ram_gb(),
        "armazenamento": get_storage_info(),
        "acesso_remoto": None,
        "sistema_operacional": get_os_info(),
        "ultimo_usuario": get_logged_user(),
        "tempo_ligado": get_uptime(),
    }

    logger.info(f"Informações coletadas: {hostname} (Serial: {serial})")
    # Log detalhado para depuração
    logger.info(f"  SO: {info['sistema_operacional']}")
    logger.info(f"  Usuário: {info['ultimo_usuario']}")
    logger.info(f"  Tempo Ligado: {info['tempo_ligado']}")
    
    return info


def send_to_api(data: dict) -> bool:
    """
    Envia dados para a API do Inventário (Next.js).
    """
    # Tenta carregar de arquivo de configuração local
    config_file = "config.json"
    if os.path.exists(config_file):
        try:
            with open(config_file, "r") as f:
                config = json.load(f)
                if not os.environ.get("APP_URL"):
                    os.environ["APP_URL"] = config.get("APP_URL", "")
                if not os.environ.get("API_KEY"):
                    os.environ["API_KEY"] = config.get("API_KEY", "")
        except:
            pass

    url = os.environ.get("APP_URL")
    key = os.environ.get("API_KEY")

    # Se não tiver nas variáveis, solicita ao usuário
    if not url or not key:
        print("\n" + "="*50)
        print("CONFIGURAÇÃO INICIAL (Apenas na primeira vez)")
        print("="*50)
        
        while not url:
            print("\nEntre com a URL do Sistema de Inventário (ex: https://seu-app.vercel.app):")
            url = input("> ").strip().rstrip('/')
            if not url:
                print("❌ A URL é obrigatória.")
        
        while not key:
            print("\nEntre com a CHAVE de API (gerada no painel):")
            key = input("> ").strip()
            if not key:
                print("❌ A Chave de API é obrigatória.")
        
        # Salva para próximas execuções
        if url and key:
            try:
                with open(config_file, "w") as f:
                    json.dump({"APP_URL": url, "API_KEY": key}, f)
                print(f"\n✅ Configuração salva em {config_file} para próximas execuções.")
            except Exception as e:
                logger.warning(f"Não foi possível salvar configuração: {e}")

    if not url or not key:
        logger.error("URL e Chave são obrigatórios para continuar.")
        return False
        
    endpoint = f"{url}/api/collect"
    headers = {
        "x-api-key": key,
        "Content-Type": "application/json"
    }

    try:
        response = requests.post(
            endpoint,
            headers=headers,
            data=json.dumps(data),
            timeout=15
        )

        if response.status_code in (200, 201):
            logger.info("✅ Dados enviados com sucesso!")
            return True
        else:
            logger.error(f"❌ Erro ao enviar: {response.status_code} - {response.text}")
            return False

    except requests.exceptions.ConnectionError:
        logger.error("❌ Erro de conexão. Verifique se a URL está correta e se você tem internet.")
        return False
    except requests.exceptions.Timeout:
        logger.error("❌ Timeout na requisição. Tente novamente mais tarde.")
        return False
    except Exception as e:
        logger.error(f"❌ Erro inesperado: {e}")
        return False


if __name__ == "__main__":
    logger.info("=" * 50)
    logger.info("Coletor de Inventário TI - v2.0")
    logger.info("=" * 50)

    system_info = collect_system_info()

    logger.info("Dados coletados:")
    for key, value in system_info.items():
        logger.info(f"  {key}: {value}")

    logger.info("-" * 50)
    success = send_to_api(system_info)

    if success:
        logger.info("Processo concluído com sucesso!")
    else:
        logger.error("Processo finalizado com erros. Verifique as mensagens acima.")
    
    print("\nExecução finalizada.")
    input("Pressione Enter para fechar a janela...")
