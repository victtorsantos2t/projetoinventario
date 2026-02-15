
const ativos = [
    // Sector A: 100% Down (Critical)
    { setor: 'Recepção', status: 'Manutenção' },
    { setor: 'Recepção', status: 'Manutenção' },

    // Sector B: 50% Down (High Mainteance Volume)
    { setor: 'TI', status: 'Manutenção' },
    { setor: 'TI', status: 'Manutenção' },
    { setor: 'TI', status: 'Manutenção' },
    { setor: 'TI', status: 'Manutenção' },
    { setor: 'TI', status: 'Em uso' },
    { setor: 'TI', status: 'Em uso' },
    { setor: 'TI', status: 'Em uso' },
    { setor: 'TI', status: 'Em uso' },

    // Sector C: 10% Down
    { setor: 'RH', status: 'Manutenção' },
    { setor: 'RH', status: 'Em uso' },
    { setor: 'RH', status: 'Em uso' },
    { setor: 'RH', status: 'Em uso' },
    { setor: 'RH', status: 'Em uso' },
    { setor: 'RH', status: 'Em uso' },
    { setor: 'RH', status: 'Em uso' },
    { setor: 'RH', status: 'Em uso' },
    { setor: 'RH', status: 'Em uso' },
    { setor: 'RH', status: 'Em uso' },
]

const secMap: any = {}
ativos.forEach(a => {
    secMap[a.setor] = (secMap[a.setor] || 0) + 1
})

const sectorRiskList = Object.entries(secMap)
    .map(([name, count]) => {
        const sectorAtivos = ativos.filter(a => a.setor === name)
        const total = sectorAtivos.length
        const maintenance = sectorAtivos.filter(a => a.status === 'Manutenção').length

        if (total === 0) return { name, total: 0, maintenance: 0, percentage: 0, isCritical: false }

        const percentage = Math.round((maintenance / total) * 100)
        const isCritical = percentage === 100 && total > 0

        return {
            name,
            total,
            maintenance,
            percentage,
            isCritical
        }
    })
    .filter(s => s.maintenance > 0)
    .sort((a, b) => {
        // Critério 1: Criticalidade (100% parado primeiro)
        if (a.isCritical && !b.isCritical) return -1
        if (!a.isCritical && b.isCritical) return 1

        // Critério 2: Quantidade absoluta
        if (b.maintenance !== a.maintenance) return b.maintenance - a.maintenance

        // Critério 3: Porcentagem
        return b.percentage - a.percentage
    })

console.log(JSON.stringify(sectorRiskList, null, 2))
