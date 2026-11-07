"""Deterministic internal ZIP; verify every entry before the caller publishes it."""
import pathlib
import sys
import zipfile

source, destination = map(pathlib.Path, sys.argv[1:])
files = sorted(p for p in source.rglob('*') if p.is_file())
with zipfile.ZipFile(destination, 'x', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
    for file in files:
        entry = zipfile.ZipInfo(file.relative_to(source).as_posix(), (1980, 1, 1, 0, 0, 0))
        entry.create_system = 3
        entry.external_attr = 0o100644 << 16
        entry.compress_type = zipfile.ZIP_DEFLATED
        archive.writestr(entry, file.read_bytes(), compresslevel=9)
with zipfile.ZipFile(destination) as archive:
    if archive.testzip() is not None:
        raise RuntimeError('ZIP CRC failed')
    if archive.namelist() != [p.relative_to(source).as_posix() for p in files]:
        raise RuntimeError('ZIP entries differ from the prepared payload')
    for file in files:
        if archive.read(file.relative_to(source).as_posix()) != file.read_bytes():
            raise RuntimeError('ZIP bytes differ: ' + str(file))
