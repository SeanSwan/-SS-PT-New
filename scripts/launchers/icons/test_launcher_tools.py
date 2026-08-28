r"""
Regression coverage for the launcher dependency auditor and icon pipeline.

These tests exercise the public functions with real filesystem/image fixtures.
They intentionally avoid the operator's Desktop and clean their temporary data.
"""

from __future__ import annotations

import pathlib
import sys
import tempfile
import unittest
from unittest import mock

from PIL import Image

HERE = pathlib.Path(__file__).resolve().parent
if str(HERE) not in sys.path:
    sys.path.insert(0, str(HERE))

import audit_launchers
import swan_icon
import swan_icon_io


EXPECTED_ICO_SIZES = {
    (16, 16),
    (20, 20),
    (24, 24),
    (32, 32),
    (40, 40),
    (48, 48),
    (64, 64),
    (96, 96),
    (128, 128),
    (256, 256),
}


class LauncherAuditTests(unittest.TestCase):
    def test_empty_launcher_has_no_checkable_dependencies(self):
        dependencies, _ = audit_launchers.dependencies("")
        self.assertEqual(set(), dependencies)

    def test_bare_path_stops_before_single_space_argument(self):
        dependencies, _ = audit_launchers.dependencies(
            r"git worktree add C:\tmp\repo codex/branch"
        )
        self.assertEqual({r"C:\tmp\repo"}, dependencies)

    def test_quoted_path_keeps_spaces_but_not_following_arguments(self):
        dependencies, _ = audit_launchers.dependencies(
            r'call "C:\Program Data\tool.exe" --mode check'
        )
        self.assertEqual({r"C:\Program Data\tool.exe"}, dependencies)

    def test_embedded_powershell_single_quoted_path_keeps_spaces(self):
        dependencies, _ = audit_launchers.dependencies(
            r'''powershell -Command "Get-Content 'C:\Program Data\tool.txt' -Raw"'''
        )
        self.assertEqual({r"C:\Program Data\tool.txt"}, dependencies)

    def test_if_not_exist_with_i_switch_expands_launcher_variables(self):
        dependencies, _ = audit_launchers.dependencies(
            'set "ROOT=C:\\gone"\nif /i not exist "%ROOT%\\tool.exe" exit /b 1'
        )
        self.assertIn(r"C:\gone\tool.exe", dependencies)

    def test_cd_without_d_and_pushd_expand_launcher_variables(self):
        dependencies, _ = audit_launchers.dependencies(
            'set "ROOT=C:\\repo"\ncd "%ROOT%"\npushd "%ROOT%\\backend"'
        )
        self.assertEqual({r"C:\repo", r"C:\repo\backend"}, dependencies)

    def test_cp1252_launcher_path_decodes_without_replacement_characters(self):
        with tempfile.TemporaryDirectory() as temp:
            source = pathlib.Path(temp) / "ansi.cmd"
            source.write_bytes('if not exist "C:\\José\\tool.exe" exit /b 1'.encode("cp1252"))
            dependencies, _ = audit_launchers.dependencies(audit_launchers.read_launcher(source))
        self.assertEqual({"C:\\José\\tool.exe"}, dependencies)

    def test_system_prefix_requires_a_path_boundary(self):
        dependencies, _ = audit_launchers.dependencies(
            r"call C:\WindowsEvil\tool.exe"
        )
        self.assertEqual({r"C:\WindowsEvil\tool.exe"}, dependencies)


class SwanIconTests(unittest.TestCase):
    def test_non_square_padding_preserves_source_alpha(self):
        with tempfile.TemporaryDirectory() as temp:
            source = pathlib.Path(temp) / "source.png"
            Image.new("RGBA", (512, 1024), (255, 0, 0, 128)).save(source)
            loaded = swan_icon.load_png(source)
        self.assertEqual(128, loaded.getpixel((512, 512))[3])

    def test_ico_writer_emits_every_expected_rgba_frame(self):
        with tempfile.TemporaryDirectory() as temp:
            target = pathlib.Path(temp) / "test.ico"
            swan_icon.write_ico(Image.new("RGBA", (1024, 1024), (10, 20, 30, 255)), target)
            with Image.open(target) as icon:
                sizes = icon.ico.sizes()
                modes = {icon.ico.getimage(size).mode for size in sizes}
        self.assertEqual(EXPECTED_ICO_SIZES, sizes)
        self.assertEqual({"RGBA"}, modes)

    def test_ico_writer_uses_each_prepared_frame_instead_of_rederiving(self):
        colors = {size: (size % 251, (255 - size) % 251, 80, 255) for size in swan_icon.ICO_SIZES}
        with tempfile.TemporaryDirectory() as temp:
            target = pathlib.Path(temp) / "markers.ico"
            with mock.patch.object(
                swan_icon_io,
                "_downscale",
                side_effect=lambda _master, size: Image.new("RGBA", (size, size), colors[size]),
            ):
                swan_icon.write_ico(Image.new("RGBA", (1024, 1024)), target)
            with Image.open(target) as icon:
                actual = {
                    size[0]: icon.ico.getimage(size).getpixel((size[0] // 2, size[1] // 2))
                    for size in icon.ico.sizes()
                }
        self.assertEqual(colors, actual)

    def test_ico_writer_preserves_existing_icon_when_serialization_fails(self):
        with tempfile.TemporaryDirectory() as temp:
            target = pathlib.Path(temp) / "existing.ico"
            target.write_bytes(b"previous-good-icon")

            def partial_write_then_fail(_image, path, **_kwargs):
                pathlib.Path(path).write_bytes(b"partial")
                raise RuntimeError("synthetic serializer failure")

            with mock.patch.object(Image.Image, "save", autospec=True, side_effect=partial_write_then_fail):
                with self.assertRaisesRegex(RuntimeError, "synthetic serializer failure"):
                    swan_icon.write_ico(Image.new("RGBA", (1024, 1024)), target)
            self.assertEqual(b"previous-good-icon", target.read_bytes())

    def test_production_modules_respect_300_line_limit(self):
        production = [
            HERE / "audit_launchers.py",
            HERE / "swan_icon.py",
            HERE / "Set-SwanLauncher.ps1",
        ]
        production.append(HERE / "swan_icon_io.py")
        lengths = {
            path.name: len(path.read_text(encoding="utf-8").splitlines())
            for path in production
        }
        self.assertEqual({}, {name: count for name, count in lengths.items() if count > 300})


if __name__ == "__main__":
    unittest.main(verbosity=2)
