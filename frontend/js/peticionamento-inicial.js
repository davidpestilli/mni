// ========================================
// PETICIONAMENTO INICIAL - MNI 3.0
// ========================================
//
// MIGRADO PARA MNI 3.0 - Seleção em Cascata
//
// FLUXO:
// 1. Carregar localidades (estado SP)
// 2. Ao selecionar localidade → Carregar competências
// 3. Ao selecionar localidade → Carregar classes
// 4. Ao selecionar classe → Carregar assuntos
//
// IMPORTANTE: Este arquivo usa API /api/mni3/* (MNI 3.0)
// O arquivo anterior usava /api/tabelas/* (MNI 2.2)

const API_BASE = 'http://localhost:3000/api';
const API_MNI3 = `${API_BASE}/mni3`;

// Estado da aplicação
let estadoAtual = {
    localidadeSelecionada: null,
    competenciaSelecionada: null,
    classeSelecionada: null,
    assuntosSecundariosDisponiveis: []  // Cache dos assuntos secundários disponíveis
};

// Carregar localidades ao iniciar
document.addEventListener('DOMContentLoaded', () => {
    carregarLocalidades();
    configurarEventosCascata();
    configurarFormulario();
});

/**
 * ========================================
 * FUNÇÕES DE CARREGAMENTO (CASCATA)
 * ========================================
 */

/**
 * PASSO 1: Carregar localidades (estado SP)
 */
async function carregarLocalidades() {
    try {
        const select = document.getElementById('localidade');
        select.innerHTML = '<option value="">🔄 Carregando localidades de SP...</option>';
        select.disabled = true;

        const response = await fetch(`${API_MNI3}/localidades?estado=SP`);
        const data = await response.json();

        if (data.success && Array.isArray(data.data)) {
            select.innerHTML = '<option value="">📍 Selecione uma comarca...</option>';

            // Ordenar alfabeticamente
            const localidadesOrdenadas = data.data.sort((a, b) => {
                const nomeA = a.descricao || '';
                const nomeB = b.descricao || '';
                return nomeA.localeCompare(nomeB);
            });

            localidadesOrdenadas.forEach(localidade => {
                const option = document.createElement('option');
                option.value = localidade.codigo;
                option.textContent = `${localidade.descricao} - SP`;
                select.appendChild(option);
            });

            select.disabled = false;
            console.log(`✅ [MNI 3.0] ${data.count} localidades carregadas`);
            mostrarNotificacao(`✅ ${data.count} comarcas carregadas!`, 'success');
        } else {
            select.innerHTML = '<option value="">❌ Erro ao carregar localidades</option>';
            select.disabled = false;
            showError('Erro ao carregar localidades: ' + data.message);
        }
    } catch (error) {
        console.error('[MNI 3.0] Erro ao carregar localidades:', error);
        const select = document.getElementById('localidade');
        select.innerHTML = '<option value="">❌ Erro de conexão</option>';
        select.disabled = false;
        showError('Erro ao carregar localidades: ' + error.message);
    }
}

/**
 * PASSO 2: Carregar competências para uma localidade
 */
async function carregarCompetencias(codigoLocalidade) {
    try {
        const select = document.getElementById('competencia');
        select.innerHTML = '<option value="">🔄 Carregando competências...</option>';
        select.disabled = true;

        const response = await fetch(`${API_MNI3}/competencias/${codigoLocalidade}`);
        const data = await response.json();

        if (data.success && Array.isArray(data.data) && data.data.length > 0) {
            select.innerHTML = '<option value="">⚖️ Selecione uma competência (opcional)...</option>';

            data.data.forEach(comp => {
                const option = document.createElement('option');
                option.value = comp.codigo;
                option.textContent = `${comp.codigo} - ${comp.descricao}`;
                select.appendChild(option);
            });

            select.disabled = false;
            console.log(`✅ [MNI 3.0] ${data.count} competências carregadas`);
        } else {
            // Se não houver competências ou erro, deixar como opcional
            select.innerHTML = '<option value="">⚖️ Nenhuma competência disponível (opcional)</option>';
            select.disabled = false;
            console.warn('[MNI 3.0] Nenhuma competência retornada para esta localidade');
        }
    } catch (error) {
        console.error('[MNI 3.0] Erro ao carregar competências:', error);
        const select = document.getElementById('competencia');
        select.innerHTML = '<option value="">❌ Erro ao carregar</option>';
        select.disabled = false;
    }
}

/**
 * PASSO 3: Carregar classes para localidade (e opcionalmente competência)
 */
async function carregarClasses(codigoLocalidade, codigoCompetencia = null) {
    try {
        const select = document.getElementById('classe');
        select.innerHTML = '<option value="">🔄 Carregando classes...</option>';
        select.disabled = true;

        let url = `${API_MNI3}/classes/${codigoLocalidade}`;
        if (codigoCompetencia) {
            url += `?competencia=${codigoCompetencia}`;
        }

        const response = await fetch(url);
        const data = await response.json();

        if (data.success && Array.isArray(data.data) && data.data.length > 0) {
            select.innerHTML = '<option value="">📋 Selecione uma classe processual...</option>';

            // Ordenar por descrição
            const classesOrdenadas = data.data.sort((a, b) => {
                return (a.descricao || '').localeCompare(b.descricao || '');
            });

            classesOrdenadas.forEach(classe => {
                const option = document.createElement('option');
                option.value = classe.codigo;
                option.textContent = `${classe.codigo} - ${classe.descricao}`;
                select.appendChild(option);
            });

            select.disabled = false;
            console.log(`✅ [MNI 3.0] ${data.count} classes válidas carregadas`);
            mostrarNotificacao(`✅ ${data.count} classes disponíveis`, 'info');
        } else {
            select.innerHTML = '<option value="">⚠️ Nenhuma classe disponível para este contexto</option>';
            select.disabled = true;
            console.warn('[MNI 3.0] Nenhuma classe retornada');
        }
    } catch (error) {
        console.error('[MNI 3.0] Erro ao carregar classes:', error);
        const select = document.getElementById('classe');
        select.innerHTML = '<option value="">❌ Erro ao carregar classes</option>';
        select.disabled = false;
        showError('Erro ao carregar classes: ' + error.message);
    }
}

/**
 * PASSO 4: Carregar assuntos para classe/localidade
 * Separa assuntos principais (principal=true) de secundários (principal=false)
 */
async function carregarAssuntos(codigoLocalidade, codigoClasse, codigoCompetencia = null) {
    try {
        const selectPrincipal = document.getElementById('assunto');
        const btnAdicionarSecundario = document.getElementById('btnAdicionarAssuntoSecundario');
        
        selectPrincipal.innerHTML = '<option value="">🔄 Carregando assuntos...</option>';
        selectPrincipal.disabled = true;
        btnAdicionarSecundario.disabled = true;
        btnAdicionarSecundario.style.opacity = '0.5';

        let url = `${API_MNI3}/assuntos/${codigoLocalidade}/${codigoClasse}`;
        if (codigoCompetencia) {
            url += `?competencia=${codigoCompetencia}`;
        }

        const response = await fetch(url);
        const data = await response.json();

        if (data.success && Array.isArray(data.data) && data.data.length > 0) {
            // Separar assuntos principais e secundários
            const assuntosPrincipais = data.data.filter(a => a.principal === true);
            const assuntosSecundarios = data.data.filter(a => a.principal === false);

            // Armazenar assuntos secundários no estado
            estadoAtual.assuntosSecundariosDisponiveis = assuntosSecundarios;

            // Popular select de assuntos principais
            if (assuntosPrincipais.length > 0) {
                selectPrincipal.innerHTML = '<option value="">⭐ Selecione um assunto principal...</option>';
                assuntosPrincipais.forEach(assunto => {
                    const option = document.createElement('option');
                    option.value = assunto.codigo;
                    option.textContent = `${assunto.codigo} - ${assunto.descricao}`;
                    selectPrincipal.appendChild(option);
                });
                selectPrincipal.disabled = false;
                console.log(`✅ [MNI 3.0] ${assuntosPrincipais.length} assuntos principais carregados`);
            } else {
                selectPrincipal.innerHTML = '<option value="">⚠️ Nenhum assunto principal disponível</option>';
                selectPrincipal.disabled = true;
            }

            // Habilitar botão de adicionar assunto secundário se houver assuntos disponíveis
            if (assuntosSecundarios.length > 0) {
                btnAdicionarSecundario.disabled = false;
                btnAdicionarSecundario.style.opacity = '1';
                console.log(`✅ [MNI 3.0] ${assuntosSecundarios.length} assuntos secundários disponíveis`);
            } else {
                btnAdicionarSecundario.disabled = true;
                btnAdicionarSecundario.style.opacity = '0.5';
            }

            mostrarNotificacao(`✅ ${assuntosPrincipais.length} principais, ${assuntosSecundarios.length} secundários`, 'info');
        } else {
            selectPrincipal.innerHTML = '<option value="">📑 Nenhum assunto disponível</option>';
            selectPrincipal.disabled = false;
            btnAdicionarSecundario.disabled = true;
            btnAdicionarSecundario.style.opacity = '0.5';
            console.warn('[MNI 3.0] Nenhum assunto retornado');
        }
    } catch (error) {
        console.error('[MNI 3.0] Erro ao carregar assuntos:', error);
        const selectPrincipal = document.getElementById('assunto');
        const btnAdicionarSecundario = document.getElementById('btnAdicionarAssuntoSecundario');
        selectPrincipal.innerHTML = '<option value="">❌ Erro ao carregar assuntos</option>';
        selectPrincipal.disabled = false;
        btnAdicionarSecundario.disabled = true;
        btnAdicionarSecundario.style.opacity = '0.5';
    }
}

/**
 * ========================================
 * EVENTOS DE CASCATA
 * ========================================
 */

function configurarEventosCascata() {
    const localidadeSelect = document.getElementById('localidade');
    const competenciaSelect = document.getElementById('competencia');
    const classeSelect = document.getElementById('classe');

    // Evento: Localidade mudou
    localidadeSelect.addEventListener('change', (e) => {
        const codigoLocalidade = e.target.value;
        estadoAtual.localidadeSelecionada = codigoLocalidade;

        if (codigoLocalidade) {
            // Resetar campos dependentes
            resetarCompetencia();
            resetarClasse();
            resetarAssunto();

            // Carregar competências e classes
            carregarCompetencias(codigoLocalidade);
            carregarClasses(codigoLocalidade);
        } else {
            // Resetar e desabilitar tudo
            resetarCompetencia();
            resetarClasse();
            resetarAssunto();
        }
    });

    // Evento: Competência mudou
    competenciaSelect.addEventListener('change', (e) => {
        const codigoCompetencia = e.target.value;
        estadoAtual.competenciaSelecionada = codigoCompetencia;

        // Recarregar classes com o filtro de competência
        if (estadoAtual.localidadeSelecionada) {
            resetarClasse();
            resetarAssunto();
            carregarClasses(estadoAtual.localidadeSelecionada, codigoCompetencia || null);
        }
    });

    // Evento: Classe mudou
    classeSelect.addEventListener('change', (e) => {
        const codigoClasse = e.target.value;
        estadoAtual.classeSelecionada = codigoClasse;

        // Mostrar/ocultar campos de CDA para Execução Fiscal (classe 1116)
        const camposExecucaoFiscal = document.getElementById('camposExecucaoFiscal');
        if (codigoClasse === '1116') {
            camposExecucaoFiscal.style.display = 'block';
            console.log('✅ Campos de CDA exibidos para Execução Fiscal');
        } else {
            camposExecucaoFiscal.style.display = 'none';
            limparCamposCDA();
        }

        if (codigoClasse && estadoAtual.localidadeSelecionada) {
            // Carregar assuntos
            carregarAssuntos(
                estadoAtual.localidadeSelecionada,
                codigoClasse,
                estadoAtual.competenciaSelecionada || null
            );
        } else {
            resetarAssunto();
        }
    });
}

/**
 * Limpar campos de CDA
 */
function limparCamposCDA() {
    document.getElementById('numeroCDA').value = '';
    document.getElementById('codigoTributoFiscal').value = '';
    document.getElementById('valorCDA').value = '';
    document.getElementById('dataApuracaoCDA').value = '';
}

/**
 * Funções de reset
 */
function resetarCompetencia() {
    const select = document.getElementById('competencia');
    select.innerHTML = '<option value="">📍 Selecione uma localidade primeiro</option>';
    select.disabled = true;
    estadoAtual.competenciaSelecionada = null;
}

function resetarClasse() {
    const select = document.getElementById('classe');
    select.innerHTML = '<option value="">📍 Selecione uma localidade primeiro</option>';
    select.disabled = true;
    estadoAtual.classeSelecionada = null;
}

function resetarAssunto() {
    const selectPrincipal = document.getElementById('assunto');
    const container = document.getElementById('assuntosSecundariosContainer');
    const btnAdicionarSecundario = document.getElementById('btnAdicionarAssuntoSecundario');
    
    selectPrincipal.innerHTML = '<option value="">📍 Selecione uma classe primeiro</option>';
    selectPrincipal.disabled = true;
    
    // Limpar container de assuntos secundários
    container.innerHTML = '';
    
    // Desabilitar botão
    btnAdicionarSecundario.disabled = true;
    btnAdicionarSecundario.style.opacity = '0.5';
    
    // Limpar cache
    estadoAtual.assuntosSecundariosDisponiveis = [];
}

/**
 * Adicionar um novo select de assunto secundário
 */
function adicionarAssuntoSecundario() {
    const container = document.getElementById('assuntosSecundariosContainer');
    const assuntosDisponiveis = estadoAtual.assuntosSecundariosDisponiveis;
    
    if (!assuntosDisponiveis || assuntosDisponiveis.length === 0) {
        mostrarNotificacao('⚠️ Nenhum assunto secundário disponível', 'warning');
        return;
    }
    
    const index = container.children.length + 1;
    
    const divAssunto = document.createElement('div');
    divAssunto.className = 'assunto-secundario-item';
    divAssunto.style.cssText = 'display: flex; gap: 10px; align-items: center; margin-bottom: 10px;';
    
    const select = document.createElement('select');
    select.className = 'assunto-secundario-select';
    select.style.cssText = 'flex: 1;';
    
    // Adicionar opção padrão
    const optionDefault = document.createElement('option');
    optionDefault.value = '';
    optionDefault.textContent = '� Selecione um assunto secundário...';
    select.appendChild(optionDefault);
    
    // Adicionar assuntos disponíveis
    assuntosDisponiveis.forEach(assunto => {
        const option = document.createElement('option');
        option.value = assunto.codigo;
        option.textContent = `${assunto.codigo} - ${assunto.descricao}`;
        select.appendChild(option);
    });
    
    // Botão remover
    const btnRemover = document.createElement('button');
    btnRemover.type = 'button';
    btnRemover.className = 'btn-remove';
    btnRemover.textContent = '✕';
    btnRemover.style.cssText = 'background: #ef4444; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; font-size: 16px; font-weight: bold;';
    btnRemover.onclick = function() {
        divAssunto.remove();
    };
    
    divAssunto.appendChild(select);
    divAssunto.appendChild(btnRemover);
    container.appendChild(divAssunto);
    
    console.log(`✅ Assunto secundário ${index} adicionado`);
}

/**
 * Obter todos os assuntos secundários selecionados
 */
function obterAssuntosSecundariosSelecionados() {
    const container = document.getElementById('assuntosSecundariosContainer');
    const selects = container.querySelectorAll('.assunto-secundario-select');
    const assuntosSelecionados = [];
    
    selects.forEach(select => {
        if (select.value && select.value.trim() !== '') {
            assuntosSelecionados.push(select.value.trim());
        }
    });
    
    return assuntosSelecionados;
}

/**
 * ========================================
 * FUNÇÕES DO FORMULÁRIO (mantidas do original)
 * ========================================
 */

function configurarFormulario() {
    const form = document.getElementById('formPeticionamentoInicial');
    form.addEventListener('submit', handleSubmit);

    // Configurar formatação automática de datas
    configurarEventosData();
}

/**
 * ========================================
 * PREENCHER DADOS DE TESTE
 * ========================================
 */

/**
 * Preenche automaticamente os dados de autor e réu para testes
 * Dados baseados no arquivo pergunta.txt
 */
function preencherDadosTeste() {
    try {
        // Preencher CPF do Signatário (do pergunta.txt)
        const signatarioInput = document.getElementById('signatario');
        if (signatarioInput) {
            signatarioInput.value = '37450364840';
        }

        // Dados do Polo Ativo (FAZENDA PÚBLICA DO ESTADO DE SÃO PAULO)
        const poloAtivoContainer = document.getElementById('poloAtivoContainer');
        const primeiraParteAtivo = poloAtivoContainer.querySelector('.parte-item');

        if (primeiraParteAtivo) {
            // Polo Ativo = Pessoa Jurídica (Fazenda)
            const tipoPessoaAtivo = primeiraParteAtivo.querySelector('.tipoPessoa');
            tipoPessoaAtivo.value = 'juridica';
            toggleTipoPessoa(tipoPessoaAtivo);

            // Dados reais do pergunta.txt
            primeiraParteAtivo.querySelector('.razaoSocial').value = 'FAZENDA PÚBLICA DO ESTADO DE SÃO PAULO';
            primeiraParteAtivo.querySelector('.cnpj').value = '46379400000150';
        }

        // Dados do Polo Passivo (MAYARA MENDES BARBOSA - Pessoa Física)
        const poloPassivoContainer = document.getElementById('poloPassivoContainer');
        const primeiraPartePassivo = poloPassivoContainer.querySelector('.parte-item');

        if (primeiraPartePassivo) {
            // Polo Passivo = Pessoa Física (Devedora)
            const tipoPessoaPassivo = primeiraPartePassivo.querySelector('.tipoPessoa');
            tipoPessoaPassivo.value = 'fisica';
            toggleTipoPessoa(tipoPessoaPassivo);

            // Dados reais do pergunta.txt
            primeiraPartePassivo.querySelector('.nomeCompleto').value = 'MAYARA MENDES BARBOSA';
            primeiraPartePassivo.querySelector('.cpf').value = '38569492839';
            primeiraPartePassivo.querySelector('.dataNascimento').value = '17/02/1990';
            primeiraPartePassivo.querySelector('.sexo').value = 'Feminino';
        }
        
        // Preencher campos de CDA se estiverem visíveis (Execução Fiscal)
        const camposCDA = document.getElementById('camposExecucaoFiscal');
        if (camposCDA && camposCDA.style.display !== 'none') {
            // Gerar número de CDA único baseado na data/hora atual
            // Formato: ANO/MÊS/DIA/HORA/MINUTO/SEGUNDO
            const agora = new Date();
            const ano = agora.getFullYear();
            const mes = String(agora.getMonth() + 1).padStart(2, '0');
            const dia = String(agora.getDate()).padStart(2, '0');
            const hora = String(agora.getHours()).padStart(2, '0');
            const minuto = String(agora.getMinutes()).padStart(2, '0');
            const segundo = String(agora.getSeconds()).padStart(2, '0');
            
            // Formato: 2025/110223145830 (ano/mêsdiahouraminutosegundo)
            const numeroCDAUnico = `${ano}/${mes}${dia}${hora}${minuto}${segundo}`;
            
            document.getElementById('numeroCDA').value = numeroCDAUnico;
            document.getElementById('codigoTributoFiscal').value = '10005';
            document.getElementById('valorCDA').value = '1436.83';
            
            // Data de apuração: hoje
            const hoje = `${ano}-${mes}-${dia}`;
            document.getElementById('dataApuracaoCDA').value = hoje;
            
            console.log(`✅ CDA único gerado: ${numeroCDAUnico}`);
        }
        
        // Mostrar notificação de sucesso
        mostrarNotificacao('✅ Dados de teste preenchidos com sucesso! (Dados reais do pergunta.txt)', 'success');
        
        console.log('✅ Dados de teste preenchidos automaticamente com dados do pergunta.txt');
        
    } catch (error) {
        console.error('Erro ao preencher dados de teste:', error);
        mostrarNotificacao('❌ Erro ao preencher dados de teste', 'error');
    }
}

/**
 * ========================================
 * FORMATAÇÃO DE DATA (DD/MM/YYYY)
 * ========================================
 */

/**
 * Formatar data automaticamente enquanto digita
 * Transforma "12031985" em "12/03/1985"
 */
function formatarDataAutomatica(input) {
    // Remove tudo que não é número
    let valor = input.value.replace(/\D/g, '');

    // Limita a 8 dígitos (DD MM YYYY)
    if (valor.length > 8) {
        valor = valor.substring(0, 8);
    }

    // Formata conforme digita
    if (valor.length >= 2) {
        valor = valor.substring(0, 2) + '/' + valor.substring(2);
    }

    if (valor.length >= 5) {
        valor = valor.substring(0, 5) + '/' + valor.substring(5);
    }

    input.value = valor;
}

/**
 * Configurar eventos de formatação para campos de data
 */
function configurarEventosData() {
    // Selecionar todos os campos de data de nascimento
    const camposData = document.querySelectorAll('.dataNascimento');

    camposData.forEach(campo => {
        // Evento para formatação automática enquanto digita
        campo.addEventListener('input', function() {
            formatarDataAutomatica(this);
        });

        // Evento para limpar formatação ao focar (opcional)
        campo.addEventListener('focus', function() {
            // Seleciona todo o texto para facilitar substituição
            this.select();
        });
    });

    // Usar MutationObserver para detectar novos campos de data adicionados dinamicamente
    // (quando usuário clica em "+ Adicionar Autor" ou "+ Adicionar Réu")
    const observer = new MutationObserver(() => {
        const novosCampos = document.querySelectorAll('.dataNascimento');
        novosCampos.forEach(campo => {
            // Verificar se já tem listener (não re-adicionar)
            if (!campo.dataset.dataListenerAdicionado) {
                campo.addEventListener('input', function() {
                    formatarDataAutomatica(this);
                });
                campo.addEventListener('focus', function() {
                    this.select();
                });
                campo.dataset.dataListenerAdicionado = 'true';
            }
        });
    });

    // Observar mudanças no DOM (quando novas partes são adicionadas)
    const containers = document.querySelectorAll('#poloAtivoContainer, #poloPassivoContainer');
    containers.forEach(container => {
        observer.observe(container, {
            childList: true,
            subtree: true
        });
    });
}

function toggleTipoPessoa(select) {
    const parteItem = select.closest('.parte-item');
    const camposPF = parteItem.querySelector('.campos-pf');
    const camposPJ = parteItem.querySelector('.campos-pj');

    if (select.value === 'fisica') {
        camposPF.style.display = 'block';
        camposPJ.style.display = 'none';
    } else {
        camposPF.style.display = 'none';
        camposPJ.style.display = 'block';
    }
}

function adicionarParte(tipoPolo) {
    const container = document.getElementById(tipoPolo === 'ativo' ? 'poloAtivoContainer' : 'poloPassivoContainer');
    const partes = container.querySelectorAll('.parte-item');
    const numero = partes.length + 1;

    const novaParteHTML = `
        <div class="parte-item" data-polo="${tipoPolo}">
            <h4>Parte ${numero} <button type="button" class="btn-remove" onclick="removerParte(this)">✕</button></h4>

            <div class="form-group">
                <label>Tipo de Pessoa:</label>
                <select class="tipoPessoa" onchange="toggleTipoPessoa(this)">
                    <option value="fisica">Pessoa Física</option>
                    <option value="juridica">Pessoa Jurídica</option>
                </select>
            </div>

            <div class="campos-pf">
                <div class="form-group">
                    <label>Nome Completo:</label>
                    <input type="text" class="nomeCompleto">
                </div>
                <div class="form-group">
                    <label>CPF:</label>
                    <input type="text" class="cpf">
                </div>
                <div class="form-group">
                    <label>Data de Nascimento:</label>
                    <input type="text" class="dataNascimento" placeholder="DD/MM/AAAA">
                </div>
                <div class="form-group">
                    <label>Sexo:</label>
                    <select class="sexo">
                        <option value="Masculino">Masculino</option>
                        <option value="Feminino">Feminino</option>
                    </select>
                </div>
            </div>

            <div class="campos-pj" style="display: none;">
                <div class="form-group">
                    <label>Razão Social:</label>
                    <input type="text" class="razaoSocial">
                </div>
                <div class="form-group">
                    <label>CNPJ:</label>
                    <input type="text" class="cnpj">
                </div>
            </div>
        </div>
    `;

    container.insertAdjacentHTML('beforeend', novaParteHTML);
}

function removerParte(button) {
    const parteItem = button.closest('.parte-item');
    const container = parteItem.parentElement;

    if (container.querySelectorAll('.parte-item').length <= 1) {
        showError('Deve haver ao menos uma parte em cada polo');
        return;
    }

    parteItem.remove();

    const partes = container.querySelectorAll('.parte-item');
    partes.forEach((parte, index) => {
        parte.querySelector('h4').firstChild.textContent = `Parte ${index + 1} `;
    });
}

function extrairPartes(tipoPolo) {
    const container = document.getElementById(tipoPolo === 'ativo' ? 'poloAtivoContainer' : 'poloPassivoContainer');
    const partesItems = container.querySelectorAll('.parte-item');
    const partes = [];
    const nomePoloPt = tipoPolo === 'ativo' ? 'Ativo (Autor)' : 'Passivo (Réu)';

    partesItems.forEach((item, index) => {
        const tipoPessoa = item.querySelector('.tipoPessoa').value;
        const numeroParteExibicao = index + 1;

        if (tipoPessoa === 'fisica') {
            const nome = item.querySelector('.nomeCompleto')?.value.trim() || '';
            const cpf = item.querySelector('.cpf')?.value.trim().replace(/\D/g, '') || '';

            // ✅ VALIDAÇÃO ADICIONADA
            if (!nome) {
                throw new Error(`Polo ${nomePoloPt}, Parte ${numeroParteExibicao}: Nome é obrigatório`);
            }
            if (!cpf) {
                throw new Error(`Polo ${nomePoloPt}, Parte ${numeroParteExibicao}: CPF é obrigatório`);
            }
            if (cpf.length !== 11) {
                throw new Error(`Polo ${nomePoloPt}, Parte ${numeroParteExibicao}: CPF inválido (deve ter 11 dígitos, recebido: ${cpf.length})`);
            }

            partes.push({
                tipoPessoa: 'fisica',
                nome: nome,
                cpf: cpf,
                dataNascimento: item.querySelector('.dataNascimento')?.value.trim() || '',
                sexo: item.querySelector('.sexo')?.value || 'Masculino'
            });
        } else {
            const nome = item.querySelector('.razaoSocial')?.value.trim() || '';
            const cnpj = item.querySelector('.cnpj')?.value.trim().replace(/\D/g, '') || '';

            // ✅ VALIDAÇÃO ADICIONADA
            if (!nome) {
                throw new Error(`Polo ${nomePoloPt}, Parte ${numeroParteExibicao}: Razão Social é obrigatória`);
            }
            if (!cnpj) {
                throw new Error(`Polo ${nomePoloPt}, Parte ${numeroParteExibicao}: CNPJ é obrigatório`);
            }
            if (cnpj.length !== 14) {
                throw new Error(`Polo ${nomePoloPt}, Parte ${numeroParteExibicao}: CNPJ inválido (deve ter 14 dígitos, recebido: ${cnpj.length})`);
            }

            partes.push({
                tipoPessoa: 'juridica',
                nome: nome,
                razaoSocial: nome,
                cnpj: cnpj
            });
        }
    });

    return partes;
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

async function handleSubmit(event) {
    event.preventDefault();

    try {
        showLoading('Enviando petição inicial via MNI 3.0...');

        // Recuperar credenciais do localStorage (já autenticadas)
        const token = localStorage.getItem('mni_token');
        if (!token) {
            throw new Error('Sessão expirada. Por favor, faça login novamente.');
        }

        // Decodificar token (base64: cpfSigla:senha)
        let cpfSigla, senha;
        try {
            const decoded = atob(token);
            [cpfSigla, senha] = decoded.split(':');
            if (!cpfSigla || !senha) {
                throw new Error('Token inválido');
            }
        } catch (e) {
            throw new Error('Erro ao decodificar credenciais. Por favor, faça login novamente.');
        }

        const localidade = document.getElementById('localidade').value;
        const classe = document.getElementById('classe').value.trim();
        const assunto = document.getElementById('assunto').value.trim();
        const valorCausa = document.getElementById('valorCausa').value;
        const competencia = document.getElementById('competencia').value.trim();
        const nivelSigilo = document.getElementById('nivelSigilo').value;

        // Capturar prioridades selecionadas
        const prioridadesCheckboxes = document.querySelectorAll('input[name="prioridade"]:checked');
        const prioridades = Array.from(prioridadesCheckboxes).map(checkbox => checkbox.value);

        const signatario = document.getElementById('signatario').value.trim().replace(/\D/g, '');

        if (!localidade) {
            throw new Error('Selecione uma localidade judicial');
        }

        if (!classe) {
            throw new Error('Informe a classe processual');
        }

        // Validar campos de CDA se for Execução Fiscal (classe 1116)
        let dadosCDA = null;
        if (classe === '1116') {
            const numeroCDA = document.getElementById('numeroCDA').value.trim();
            const codigoTributoFiscal = document.getElementById('codigoTributoFiscal').value.trim();
            const valorCDA = document.getElementById('valorCDA').value;
            const dataApuracaoCDA = document.getElementById('dataApuracaoCDA').value;

            if (!numeroCDA) {
                throw new Error('Informe o número da CDA para Execução Fiscal');
            }
            if (!codigoTributoFiscal) {
                throw new Error('Informe o código do tributo fiscal');
            }
            if (!valorCDA || parseFloat(valorCDA) <= 0) {
                throw new Error('Informe o valor da CDA');
            }
            if (!dataApuracaoCDA) {
                throw new Error('Informe a data de apuração do valor da CDA');
            }

            // Converter data para formato YYYYMMDDHHMMSS
            const dataObj = new Date(dataApuracaoCDA);
            const dataFormatada = dataObj.getFullYear() +
                String(dataObj.getMonth() + 1).padStart(2, '0') +
                String(dataObj.getDate()).padStart(2, '0') +
                '183109'; // Horário fixo como no exemplo

            dadosCDA = {
                numeroCDA: numeroCDA,
                codigoTributoFiscal: codigoTributoFiscal,
                valorCDA: parseFloat(valorCDA),
                dataApuracaoCDA: dataFormatada
            };

            console.log('[CDA] Dados da CDA:', dadosCDA);
        }

        if (!signatario || signatario.length !== 11) {
            throw new Error('Informe um CPF válido para o signatário');
        }

        const poloAtivo = extrairPartes('ativo');
        const poloPassivo = extrairPartes('passivo');

        if (poloAtivo.length === 0) {
            throw new Error('Informe ao menos uma parte no polo ativo');
        }

        if (poloPassivo.length === 0) {
            throw new Error('Informe ao menos uma parte no polo passivo');
        }

        const peticaoInicialFile = document.getElementById('peticaoInicial').files[0];
        if (!peticaoInicialFile) {
            throw new Error('Anexe a petição inicial (PDF)');
        }

        const documentos = [];

        const peticaoBase64 = await fileToBase64(peticaoInicialFile);
        documentos.push({
            tipoDocumento: 1,
            conteudo: peticaoBase64,
            nomeDocumento: peticaoInicialFile.name,
            mimetype: 'application/pdf',
            nivelSigilo: parseInt(nivelSigilo),
            signatario: signatario || null
        });

        const docsAdicionais = document.getElementById('documentosAdicionais').files;
        for (let i = 0; i < docsAdicionais.length; i++) {
            const docBase64 = await fileToBase64(docsAdicionais[i]);
            documentos.push({
                tipoDocumento: 2,
                conteudo: docBase64,
                nomeDocumento: docsAdicionais[i].name,
                mimetype: 'application/pdf',
                nivelSigilo: parseInt(nivelSigilo)
            });
        }

        // Obter assuntos secundários selecionados
        const assuntosSecundarios = obterAssuntosSecundariosSelecionados();

        const payload = {
            codigoLocalidade: localidade,
            classeProcessual: classe,
            assunto: assunto || null,
            assuntosSecundarios: assuntosSecundarios.length > 0 ? assuntosSecundarios : null,
            valorCausa: valorCausa ? parseFloat(valorCausa) : null,
            competencia: competencia || null,
            nivelSigilo: parseInt(nivelSigilo),
            prioridades: prioridades.length > 0 ? prioridades : null,
            poloAtivo,
            poloPassivo,
            signatario,
            documentos,
            dadosCDA: dadosCDA  // Adicionar dados de CDA se for Execução Fiscal
        };

        console.log('[MNI 3.0] Payload:', payload);
        console.log('[MNI 3.0] Assunto principal:', payload.assunto);
        console.log('[MNI 3.0] Assuntos secundários:', payload.assuntosSecundarios);

        const response = await fetch(`${API_BASE}/peticionamento/inicial`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        hideLoading();

        if (data.success) {
            showSuccess(`
                <h3>✅ Petição Inicial Enviada com Sucesso! (MNI 3.0)</h3>
                <p><strong>Número do Processo:</strong> ${data.data.numeroProcesso || 'N/A'}</p>
                <p><strong>Protocolo:</strong> ${data.data.protocoloRecebimento || 'N/A'}</p>
                <p><strong>Data:</strong> ${data.data.dataOperacao || 'N/A'}</p>
                ${data.data.recibo ? `<p><strong>Recibo:</strong> <a href="data:application/pdf;base64,${data.data.recibo}" download="recibo.pdf">Baixar Recibo PDF</a></p>` : ''}
            `);

            document.getElementById('formPeticionamentoInicial').reset();

            // Resetar estado
            estadoAtual = {
                localidadeSelecionada: null,
                competenciaSelecionada: null,
                classeSelecionada: null
            };

            // Recarregar localidades
            carregarLocalidades();
        } else {
            showError('Erro ao enviar petição: ' + data.message);
        }

        await carregarSoapDebug();

    } catch (error) {
        hideLoading();
        console.error('[MNI 3.0] Erro:', error);
        showError('Erro ao enviar petição: ' + error.message);
    }
}

function showLoading(message) {
    const resultado = document.getElementById('resultado');
    const conteudo = document.getElementById('resultadoConteudo');

    conteudo.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <p>${message}</p>
        </div>
    `;

    resultado.style.display = 'block';
    resultado.scrollIntoView({ behavior: 'smooth' });
}

function hideLoading() {
    // Mantém o resultado visível
}

function showSuccess(html) {
    const conteudo = document.getElementById('resultadoConteudo');
    conteudo.innerHTML = `<div class="success">${html}</div>`;
}

function showError(message) {
    const conteudo = document.getElementById('resultadoConteudo');
    conteudo.innerHTML = `<div class="error">❌ ${message}</div>`;

    const resultado = document.getElementById('resultado');
    resultado.style.display = 'block';
    resultado.scrollIntoView({ behavior: 'smooth' });
}

function mostrarNotificacao(mensagem, tipo = 'info') {
    const notificacao = document.createElement('div');
    notificacao.className = `toast toast-${tipo}`;
    notificacao.textContent = mensagem;
    notificacao.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${tipo === 'success' ? '#10b981' : tipo === 'error' ? '#ef4444' : '#3b82f6'};
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        z-index: 10000;
        animation: slideInRight 0.3s ease-out;
        font-weight: 500;
    `;

    document.body.appendChild(notificacao);

    setTimeout(() => {
        notificacao.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => {
            document.body.removeChild(notificacao);
        }, 300);
    }, 3000);
}

// Adicionar animações CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// ========== Funções de Debug SOAP (mantidas) ==========

async function carregarSoapDebug() {
    try {
        const response = await fetch(`${API_BASE}/peticionamento/debug/last-soap`);
        const data = await response.json();

        if (data.success) {
            const soapDebug = document.getElementById('soapDebug');
            const soapRequest = document.getElementById('soapRequest');
            const soapResponse = document.getElementById('soapResponse');

            soapRequest.textContent = formatarXML(data.data.request);
            soapResponse.textContent = formatarXML(data.data.response);

            soapDebug.style.display = 'block';

            const debugContent = document.getElementById('soapDebugContent');
            debugContent.style.display = 'block';
            document.getElementById('toggleIcon').textContent = '▲';

            setTimeout(() => {
                soapDebug.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 300);

            console.log('✅ XML SOAP carregado para visualização');
        }
    } catch (error) {
        console.error('Erro ao carregar SOAP debug:', error);
    }
}

function formatarXML(xml) {
    if (!xml || xml === 'Nenhuma requisição SOAP ainda' || xml === 'Nenhuma resposta SOAP ainda') {
        return xml;
    }

    try {
        const PADDING = '  ';
        const reg = /(>)(<)(\/*)/g;
        let formatted = xml.replace(reg, '$1\n$2$3');
        let pad = 0;

        formatted = formatted.split('\n').map(node => {
            let indent = 0;
            if (node.match(/.+<\/\w[^>]*>$/)) {
                indent = 0;
            } else if (node.match(/^<\/\w/) && pad > 0) {
                pad -= 1;
            } else if (node.match(/^<\w[^>]*[^\/]>.*$/)) {
                indent = 1;
            } else {
                indent = 0;
            }

            const padding = PADDING.repeat(pad);
            pad += indent;

            return padding + node;
        }).join('\n');

        return formatted;
    } catch (e) {
        console.error('Erro ao formatar XML:', e);
        return xml;
    }
}

function toggleSoapDebug() {
    const content = document.getElementById('soapDebugContent');
    const icon = document.getElementById('toggleIcon');

    if (content.style.display === 'none') {
        content.style.display = 'block';
        icon.textContent = '▲';
    } else {
        content.style.display = 'none';
        icon.textContent = '▼';
    }
}

async function copiarXML(tipo) {
    try {
        const elementId = tipo === 'request' ? 'soapRequest' : 'soapResponse';
        const element = document.getElementById(elementId);
        const xml = element.textContent;

        await navigator.clipboard.writeText(xml);

        mostrarNotificacao(`✅ XML ${tipo === 'request' ? 'de requisição' : 'de resposta'} copiado!`, 'success');
    } catch (error) {
        console.error('Erro ao copiar XML:', error);
        mostrarNotificacao('❌ Erro ao copiar XML', 'error');
    }
}

function baixarXML(tipo) {
    try {
        const elementId = tipo === 'request' ? 'soapRequest' : 'soapResponse';
        const element = document.getElementById(elementId);
        const xml = element.textContent;

        const blob = new Blob([xml], { type: 'application/xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        a.href = url;
        a.download = `soap-${tipo}-${timestamp}.xml`;

        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        URL.revokeObjectURL(url);

        mostrarNotificacao(`💾 XML ${tipo === 'request' ? 'de requisição' : 'de resposta'} baixado!`, 'success');
    } catch (error) {
        console.error('Erro ao baixar XML:', error);
        mostrarNotificacao('❌ Erro ao baixar XML', 'error');
    }
}
