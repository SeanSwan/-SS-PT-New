using System;
using System.Diagnostics;
using System.IO;
using System.Linq;

internal static class HiddenRunner
{
    private static readonly string LogPath = Path.Combine(
        AppDomain.CurrentDomain.BaseDirectory, "hidden-runner.log");

    [STAThread]
    private static int Main(string[] args)
    {
        if (args.Length == 0)
        {
            Log("blocked no-arguments");
            return 2;
        }

        try
        {
            Log("start file=" + Path.GetFileName(args[0]) + " args=" + (args.Length - 1));
            var startInfo = new ProcessStartInfo
            {
                FileName = args[0],
                Arguments = string.Join(" ", args.Skip(1).Select(Quote)),
                UseShellExecute = false,
                CreateNoWindow = true,
                WindowStyle = ProcessWindowStyle.Hidden,
            };
            using (var process = Process.Start(startInfo))
            {
                if (process == null)
                {
                    return 3;
                }
                process.WaitForExit();
                Log("finish childExit=" + process.ExitCode);
                return process.ExitCode;
            }
        }
        catch (Exception error)
        {
            Log("error type=" + error.GetType().Name + " message=" + error.Message);
            return 4;
        }
    }

    private static string Quote(string value)
    {
        if (value.Length > 0 && value.All(c => !char.IsWhiteSpace(c) && c != '"'))
        {
            return value;
        }
        return "\"" + value.Replace("\\", "\\\\").Replace("\"", "\\\"") + "\"";
    }

    private static void Log(string message)
    {
        try
        {
            File.AppendAllText(LogPath, DateTimeOffset.Now.ToString("o") + " " + message + Environment.NewLine);
        }
        catch
        {
            // Diagnostics must never prevent the requested child from running.
        }
    }
}
