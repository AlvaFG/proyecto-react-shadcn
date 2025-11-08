#!/usr/bin/env node

/**
 * Script de verificación de configuración para Vercel
 * Ejecutar con: node verify-config.js
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔍 Verificando configuración del proyecto...\n');

let hasErrors = false;

// Verificar package.json
try {
  const packageJson = JSON.parse(readFileSync(join(__dirname, 'package.json'), 'utf-8'));
  console.log('✅ package.json encontrado');
  
  if (packageJson.scripts['build:prod']) {
    console.log('✅ Script build:prod configurado');
  } else {
    console.log('❌ Script build:prod NO encontrado');
    hasErrors = true;
  }
} catch (error) {
  console.log('❌ Error al leer package.json:', error.message);
  hasErrors = true;
}

// Verificar vercel.json
try {
  const vercelJson = JSON.parse(readFileSync(join(__dirname, 'vercel.json'), 'utf-8'));
  console.log('✅ vercel.json encontrado');
  
  if (vercelJson.buildCommand === 'npm run build:prod') {
    console.log('✅ buildCommand usa build:prod');
  } else {
    console.log('⚠️  buildCommand no usa build:prod:', vercelJson.buildCommand);
  }
  
  if (vercelJson.rewrites && vercelJson.rewrites.length > 0) {
    console.log('✅ Rewrites configurados:', vercelJson.rewrites.length);
  } else {
    console.log('⚠️  No hay rewrites configurados');
  }
} catch (error) {
  console.log('❌ Error al leer vercel.json:', error.message);
  hasErrors = true;
}

// Verificar archivos .env
const envFiles = ['.env.development', '.env.production', '.env.example'];
envFiles.forEach(file => {
  try {
    readFileSync(join(__dirname, file), 'utf-8');
    console.log(`✅ ${file} encontrado`);
  } catch (error) {
    console.log(`⚠️  ${file} no encontrado`);
  }
});

// Verificar .gitignore
try {
  const gitignore = readFileSync(join(__dirname, '.gitignore'), 'utf-8');
  if (gitignore.includes('.env')) {
    console.log('✅ .gitignore protege archivos .env');
  } else {
    console.log('⚠️  .gitignore no protege archivos .env');
  }
} catch (error) {
  console.log('⚠️  .gitignore no encontrado');
}

console.log('\n' + '='.repeat(50));
if (hasErrors) {
  console.log('❌ Se encontraron errores en la configuración');
  process.exit(1);
} else {
  console.log('✅ Configuración verificada correctamente');
  console.log('\n📝 Próximos pasos:');
  console.log('1. Configura las variables de entorno en Vercel Dashboard');
  console.log('2. Despliega tu aplicación: git push');
  console.log('3. Verifica que las llamadas API funcionen en producción');
}
