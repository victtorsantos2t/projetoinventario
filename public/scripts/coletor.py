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
    print("ERRO: Módulo 'requests' não encontrado. Instale com: pip install requests")
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
            result = subprocess.run(
                ["wmic", "cpu", "get", "name"],
                capture_output=True, text=True, timeout=10
            )
            lines = result.stdout.strip().split('\n')
            if len(lines) >= 2:
                return lines[1].strip()
        elif platform.system() == "Linux":
            with open("/proc/cpuinfo", "r") as f:
                for line in f:
                    if "model name" in line:
                        return line.split(":")[1].strip()
    except Exception as e:
        logger.warning(f"Erro ao obter CPU: {e}")

    return platform.processor() or "Desconhecido"


def get_ram_gb() -> str:
    """Obtém a quantidade total de RAM em GB."""
    try:
        if platform.system() == "Windows":
            result = subprocess.run(
                ["wmic", "computersystem", "get", "totalphysicalmemory"],
                capture_output=True, text=True, timeout=10
            )
            lines = result.stdout.strip().split('\n')
            if len(lines) >= 2:
                total_bytes = int(lines[1].strip())
                gb = round(total_bytes / (1024 ** 3))
                return f"{gb} GB"
        elif platform.system() == "Linux":
            with open("/proc/meminfo", "r") as f:
                for line in f:
                    if "MemTotal" in line:
                        kb = int(line.split()[1])
                        gb = round(kb / (1024 ** 2))
                        return f"{gb} GB"
    except Exception as e:
        logger.warning(f"Erro ao obter RAM: {e}")

    return "Desconhecido"


def get_storage_info() -> str:
    """Obtém informações de armazenamento principal."""
    try:
        if platform.system() == "Windows":
            result = subprocess.run(
                ["wmic", "diskdrive", "get", "size,model"],
                capture_output=True, text=True, timeout=10
            )
            lines = result.stdout.strip().split('\n')
            if len(lines) >= 2:
                parts = lines[1].strip().split()
                if parts:
                    # Last element is usually the size in bytes
                    size_bytes = int(parts[-1])
                    gb = round(size_bytes / (1024 ** 3))
                    if gb >= 900:
                        return f"{round(gb / 1024)} TB"
                    elif gb >= 100:
                        return f"{gb} GB SSD"
                    else:
                        return f"{gb} GB"
    except Exception as e:
        logger.warning(f"Erro ao obter armazenamento: {e}")

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
    }

    logger.info(f"Informações coletadas: {hostname} (Serial: {serial})")
    return info


def send_to_supabase(data: dict) -> bool:
    """
    Envia dados para o Supabase usando upsert (insert + update on conflict).
    Se o serial já existir, atualiza os dados. Se não, insere um novo registro.
    """
    # Tenta carregar de arquivo de configuração local
    config_file = "config.json"
    if os.path.exists(config_file):
        try:
            with open(config_file, "r") as f:
                config = json.load(f)
                if not os.environ.get("SUPABASE_URL"):
                    os.environ["SUPABASE_URL"] = config.get("SUPABASE_URL", "")
                if not os.environ.get("SUPABASE_KEY"):
                    os.environ["SUPABASE_KEY"] = config.get("SUPABASE_KEY", "")
        except:
            pass

    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")

    # Se não tiver nas variáveis, solicita ao usuário
    if not url or not key:
        print("\n" + "="*50)
        print("CONFIGURAÇÃO INICIAL (Apenas na primeira vez)")
        print("="*50)
        
        if not url:
            print("\nEntre com a URL do Supabase (ex: https://seu-projeto.supabase.co):")
            url = input("> ").strip()
        
        if not key:
            print("\nEntre com a CHAVE de API (gerada no painel):")
            key = input("> ").strip()
        
        # Salva para próximas execuções
        if url and key:
            try:
                with open(config_file, "w") as f:
                    json.dump({"SUPABASE_URL": url, "SUPABASE_KEY": key}, f)
                print(f"\n✅ Configuração salva em {config_file} para próximas execuções.")
            except Exception as e:
                logger.warning(f"Não foi possível salvar configuração: {e}")

    if not url or not key:
        logger.error("URL e Chave são obrigatórios para continuar.")
        return False
        
    endpoint = f"{url}/rest/v1/ativos"
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates",  # upsert: merge on conflict
    }

    try:
        response = requests.post(
            endpoint,
            headers=headers,
            data=json.dumps(data),
            timeout=15
        )

        if response.status_code in (200, 201):
            logger.info("✅ Dados enviados com sucesso (inserido)")
            return True
        elif response.status_code == 409:
            # Conflito = serial já existe, tentar PATCH
            logger.info("Serial já existe, atualizando...")
            patch_headers = {**headers}
            patch_headers.pop("Prefer", None)

            patch_response = requests.patch(
                f"{endpoint}?serial=eq.{data['serial']}",
                headers=patch_headers,
                data=json.dumps(data),
                timeout=15
            )

            if patch_response.status_code in (200, 204):
                logger.info("✅ Dados atualizados com sucesso")
                return True
            else:
                logger.error(f"❌ Erro ao atualizar: {patch_response.status_code} - {patch_response.text}")
                return False
        else:
            logger.error(f"❌ Erro ao enviar: {response.status_code} - {response.text}")
            return False

    except requests.exceptions.ConnectionError:
        logger.error("❌ Erro de conexão. Verifique sua internet e a URL do Supabase.")
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
    success = send_to_supabase(system_info)

    if success:
        logger.info("Processo concluído com sucesso!")
    else:
        logger.error("Processo finalizado com erros. Verifique as mensagens acima.")
        sys.exit(1)
