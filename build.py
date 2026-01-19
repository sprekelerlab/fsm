#!/usr/bin/env python3

import argparse, os, shutil, time, sys

def sources():
	path = './src/'
	return [os.path.join(base, f) for base, folders, files in os.walk(path) for f in files if f.endswith('.js')]

def build():
	path = './www/fsm.js'
	data = '\n'.join(open(file, 'r').read() for file in sources())
	with open(path, 'w') as f:
		f.write(data)
	print('built %s (%u bytes)' % (path, len(data)))

def copy_www(target_path):
	source_path = './www'
	target_path = os.path.abspath(target_path)
	source_path = os.path.abspath(source_path)
	if target_path == source_path:
		return
	os.makedirs(target_path, exist_ok=True)
	for root, dirs, files in os.walk(source_path):
		rel_root = os.path.relpath(root, source_path)
		dest_root = target_path if rel_root == '.' else os.path.join(target_path, rel_root)
		os.makedirs(dest_root, exist_ok=True)
		for name in files:
			shutil.copy2(os.path.join(root, name), os.path.join(dest_root, name))

def stat():
	return [os.stat(file).st_mtime for file in sources()]

def monitor():
	a = stat()
	while True:
		time.sleep(0.5)
		b = stat()
		if a != b:
			a = b
			build()

if __name__ == '__main__':
	parser = argparse.ArgumentParser()
	parser.add_argument('--path', default='www', help='Target output directory (default: www)')
	parser.add_argument('--watch', action='store_true', help='Rebuild on source changes')
	args = parser.parse_args()
	build()
	copy_www(args.path)
	print('build available at %s' % os.path.abspath(args.path))
	if args.watch:
		monitor()
