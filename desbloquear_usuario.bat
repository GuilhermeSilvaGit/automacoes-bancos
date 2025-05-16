@echo off
cd C:\Users\guilherme-cordeiro\Desktop\projetos

set /p usuario_master="Digite o LOGIN Master: "
set /p senha_master="Digite a SENHA Master: "
set /p usuario_desbloquear="Digite o LOGIN do usuário a ser desbloqueado: "
set /p email_destino="Digite o E-mail de destino para a nova senha: "

echo Desbloqueando o usuário: %usuario_desbloquear% e enviando para %email_destino%...
node desbloquear_usuario.js "%usuario_master%" "%senha_master%" "%usuario_desbloquear%" "%email_destino%"
pause