Set oShell = CreateObject ("Wscript.Shell")
Dim strArgs
' Executa o python redirecionando para o coletor.py na mesma pasta
strArgs = "pythonw.exe coletor.py"
oShell.Run strArgs, 0, false
