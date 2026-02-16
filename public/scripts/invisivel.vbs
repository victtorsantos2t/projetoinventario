Set oShell = CreateObject("Wscript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' Obtém o diretório do script atual
strScriptPath = fso.GetParentFolderName(WScript.ScriptFullName)

' Executa o pythonw.exe apontando para o coletor.py na mesma pasta
strArgs = "pythonw.exe """ & strScriptPath & "\coletor.py"""
oShell.CurrentDirectory = strScriptPath
oShell.Run strArgs, 0, False
