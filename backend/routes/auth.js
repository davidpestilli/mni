const express = require('express');
const router = express.Router();
const mniClient = require('../services/mniClient');
const { gerarSenhaHashMNI } = require('../services/hashUtils');

/**
 * POST /api/auth/login
 * Autenticar usuário no sistema MNI
 */
router.post('/login', async (req, res) => {
    try {
        const { idConsultante, senhaConsultante, idRepresentado } = req.body;

        // Validações básicas
        if (!idConsultante || !senhaConsultante) {
            return res.status(400).json({
                success: false,
                message: 'CPF/Sigla e senha são obrigatórios'
            });
        }

        // Validar CPF (11 dígitos) ou sigla (sem limite de tamanho)
        // CPF: exatamente 11 dígitos
        // Sigla: mínimo 3 caracteres, pode conter letras, números, pontos (.), underscores (_), hífens (-)
        if (!/^\d{11}$/.test(idConsultante) && !/^[A-Za-z0-9._-]{3,}$/.test(idConsultante)) {
            return res.status(400).json({
                success: false,
                message: 'Informe um CPF com 11 dígitos ou uma sigla válida (mínimo 3 caracteres)'
            });
        }

        // Validar idRepresentado (opcional)
        // Deve ser CPF (11 dígitos) ou CNPJ (14 dígitos)
        if (idRepresentado) {
            if (!/^\d{11}$/.test(idRepresentado) && !/^\d{14}$/.test(idRepresentado)) {
                return res.status(400).json({
                    success: false,
                    message: 'ID Representado inválido. Deve ser um CPF (11 dígitos) ou CNPJ (14 dígitos)'
                });
            }

            console.log('[AUTH] Login com filtro de representado:', idRepresentado);
        }

        // Gerar hash SHA256 da senha com data (formato MNI)
        const senhaHash = gerarSenhaHashMNI(senhaConsultante);

        console.log('════════════════════════════════════════════════════════════');
        console.log('🔐 AUTENTICAÇÃO BACKEND');
        console.log('════════════════════════════════════════════════════════════');
        console.log('Usuário:', idConsultante);
        console.log('Hash senha:', senhaHash);
        console.log('ID Representado:', idRepresentado || 'Não informado');
        console.log('═══════════════════════════════════════════════════════════');

        // Tentar autenticar fazendo uma consulta simples de avisos
        const avisos = await mniClient.consultarAvisosPendentes(
            idConsultante,
            senhaHash,
            {},
            idRepresentado  // Passar idRepresentado como 4º parâmetro
        );

        // Se chegou aqui, autenticação foi bem-sucedida
        const responseData = {
            success: true,
            message: 'Autenticação realizada com sucesso',
            user: {
                id: idConsultante
            },
            // IMPORTANTE: Armazenar a senha ORIGINAL, não o hash, pois o hash muda diariamente
            token: Buffer.from(`${idConsultante}:${senhaConsultante}`).toString('base64')
        };

        // Incluir idRepresentado na resposta se foi informado
        if (idRepresentado) {
            responseData.user.idRepresentado = idRepresentado;
        }

        res.json(responseData);

    } catch (error) {
        console.error('[AUTH] Erro no login:', error.message);
        res.status(401).json({
            success: false,
            message: error.message || 'Falha na autenticação'
        });
    }
});

/**
 * POST /api/auth/validate
 * Validar token de sessão
 */
router.post('/validate', (req, res) => {
    const { token } = req.body;

    if (!token) {
        return res.status(400).json({
            success: false,
            message: 'Token não fornecido'
        });
    }

    try {
        // Decodificar token (em produção seria JWT)
        const decoded = Buffer.from(token, 'base64').toString('utf-8');
        // Extrair ID (antes do primeiro ":")
        // A senha pode conter ":" então usar indexOf para encontrar o primeiro ":"
        const colonIndex = decoded.indexOf(':');
        if (colonIndex === -1) {
            throw new Error('Token mal formatado');
        }
        const id = decoded.substring(0, colonIndex);

        res.json({
            success: true,
            user: { id }
        });
    } catch (error) {
        res.status(401).json({
            success: false,
            message: 'Token inválido'
        });
    }
});

module.exports = router;
