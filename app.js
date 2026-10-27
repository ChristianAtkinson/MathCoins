/* ═══════════════════════════════════════════════════════ */
/* MATHCOINS - APP.JS (VERSIÓN FINAL CON PORTADA)          */
/* Sistema de gamificación educativa                       */
/* ═══════════════════════════════════════════════════════ */

// ═══════════════════════════════════════════════════════
// ESTADO GLOBAL DE LA APLICACIÓN
// ═══════════════════════════════════════════════════════
const APP = {
    data: {
        config: {
            anio: 2025,
            catalogo: [
                { id: 1, icon: '🎵', item: 'Elegir música en clase', costo: 5 },
                { id: 2, icon: '📝', item: 'Saltar 1 tarea', costo: 10 },
                { id: 3, icon: '🆘', item: 'Ayuda en examen', costo: 15 }
            ]
        },
        cursos: []
    },
    state: {
        currentView: 'home',
        currentCourseId: null,
        isAdminLoggedIn: false,
        isStudentLoggedIn: false,
        currentStudentId: null,
        adminPassword: 'profe'
    }
};

// ═══════════════════════════════════════════════════════
// PERSISTENCIA (localStorage)
// ═══════════════════════════════════════════════════════
const Storage = {
    KEY: 'mathcoins_data',
    save() {
        localStorage.setItem(this.KEY, JSON.stringify(APP.data));
    },
    load() {
        const saved = localStorage.getItem(this.KEY);
        if (saved) {
            try {
                APP.data = JSON.parse(saved);
                return true;
            } catch (e) {
                console.error('Error al cargar datos:', e);
                return false;
            }
        }
        return false;
    },
    clear() {
        localStorage.removeItem(this.KEY);
    }
};

// ══════════════════════════════════════════════════════
// UTILIDADES
// ═══════════════════════════════════════════════════════
const Utils = {
    getNivel(saldo) {
        if (saldo >= 50) return { nombre: '💎 Maestro', color: '#60a5fa' };
        if (saldo >= 25) return { nombre: '🌟 Experto', color: '#fbbf24' };
        if (saldo >= 10) return { nombre: '⭐ Aprendiz', color: '#10b981' };
        return { nombre: '🔰 Novato', color: '#9ca3af' };
    },
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },
    formatDate(dateStr) {
        const d = new Date(dateStr);
        return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
    },
    getCurrentCourse() {
        return APP.data.cursos.find(c => c.id === APP.state.currentCourseId);
    },
    calcularSaldo(estudiante) {
        const ganados = estudiante.historial.filter(h => h.tipo === 'sum').reduce((sum, h) => sum + h.monto, 0);
        const gastados = estudiante.historial.filter(h => h.tipo === 'sub').reduce((sum, h) => sum + h.monto, 0);
        return ganados - gastados;
    }
};

// ═══════════════════════════════════════════════════════
// NAVEGACIÓN (ACTUALIZADA CON PORTADA)
// ═══════════════════════════════════════════════════════
const Navigation = {
    init() {
        // Botones de la portada
        document.getElementById('btn-go-wallet').addEventListener('click', () => {
            this.switchView('private');
            Renderer.renderCourseSelectors();
        });
        
        document.getElementById('btn-go-ranking').addEventListener('click', () => {
            this.switchView('public');
            Renderer.renderPublicView();
        });
        
        // Botones de volver al inicio
        document.getElementById('btn-back-home-1').addEventListener('click', () => this.switchView('home'));
        
        document.getElementById('btn-back-home-2').addEventListener('click', () => {
            if (APP.state.isStudentLoggedIn) {
                APP.state.isStudentLoggedIn = false;
                APP.state.currentStudentId = null;
                document.getElementById('private-login').classList.remove('hidden');
                document.getElementById('private-wallet').classList.add('hidden');
            }
            this.switchView('home');
        });
        
        document.getElementById('btn-back-home-3').addEventListener('click', () => this.switchView('home'));
    },
    
    switchView(viewName) {
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.getElementById(`view-${viewName}`).classList.add('active');
        APP.state.currentView = viewName;
    }
};

// ═══════════════════════════════════════════════════════
// RENDERIZADO
// ═══════════════════════════════════════════════════════
const Renderer = {
    renderCourseSelectors() {
        const selects = ['select-course', 'login-course', 'admin-course'];
        selects.forEach(id => {
            const select = document.getElementById(id);
            if (!select) return;
            const currentValue = select.value;
            select.innerHTML = '<option value="">-- Seleccioná un curso --</option>';
            APP.data.cursos.filter(c => c.activo !== false).forEach(curso => {
                const opt = document.createElement('option');
                opt.value = curso.id;
                opt.textContent = `${curso.nombre} - ${curso.escuela}`;
                select.appendChild(opt);
            });
            if (currentValue) select.value = currentValue;
        });
    },
    renderPublicView() {
        this.renderCourseSelectors();
        this.renderRanking();
        this.renderCatalog();
    },
    renderRanking() {
        const tbody = document.getElementById('ranking-body');
        const curso = Utils.getCurrentCourse();
        if (!curso) {
            tbody.innerHTML = '<tr><td colspan="4" class="empty-msg">Seleccioná un curso para ver el ranking</td></tr>';
            return;
        }
        const ranking = [...curso.estudiantes]
            .map(e => ({ ...e, saldo: Utils.calcularSaldo(e) }))
            .sort((a, b) => b.saldo - a.saldo);
        
        if (ranking.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="empty-msg">No hay alumnos en este curso</td></tr>';
            return;
        }
        tbody.innerHTML = ranking.map((est, i) => {
            const nivel = Utils.getNivel(est.saldo);
            const posicion = i === 0 ? '🥇' : i === 1 ? '' : i === 2 ? '' : (i + 1);
            return `
                <tr>
                    <td>${posicion}</td>
                    <td>${est.nombre}</td>
                    <td><strong>${est.saldo}</strong></td>
                    <td style="color: ${nivel.color}">${nivel.nombre}</td>
                </tr>
            `;
        }).join('');
    },
    renderCatalog() {
        const grid = document.getElementById('catalog-grid');
        if(grid) {
            grid.innerHTML = APP.data.config.catalogo.map(item => `
                <div class="catalog-item">
                    <div class="catalog-icon">${item.icon || '🎁'}</div>
                    <div class="catalog-name">${item.item}</div>
                    <div class="catalog-price">${item.costo} coins</div>
                </div>
            `).join('');
        }
    },
    renderStudentLogin() {
        const curso = APP.data.cursos.find(c => c.id === document.getElementById('login-course').value);
        const selectName = document.getElementById('login-name');
        selectName.innerHTML = '<option value="">-- Seleccioná tu nombre --</option>';
        if (curso) {
            curso.estudiantes.forEach(est => {
                const opt = document.createElement('option');
                opt.value = est.id;
                opt.textContent = est.nombre;
                selectName.appendChild(opt);
            });
        }
    },
    renderWallet(estudiante, curso) {
        const saldo = Utils.calcularSaldo(estudiante);
        const nivel = Utils.getNivel(saldo);
        document.getElementById('wallet-student-name').textContent = `${estudiante.nombre} · ${curso.nombre}`;
        document.getElementById('wallet-balance').textContent = saldo;
        document.getElementById('wallet-level').textContent = nivel.nombre;
        document.getElementById('wallet-level').style.color = nivel.color;
        
        const historyList = document.getElementById('wallet-history');
        if (estudiante.historial.length === 0) {
            historyList.innerHTML = '<li class="empty-msg">Sin movimientos registrados</li>';
        } else {
            historyList.innerHTML = estudiante.historial.slice().reverse().map(h => `
                <li>
                    <span>${Utils.formatDate(h.fecha)} · ${h.motivo}</span>
                    <span class="${h.tipo === 'sum' ? 'history-positive' : 'history-negative'}">
                        ${h.tipo === 'sum' ? '+' : '-'}${h.monto}
                    </span>
                </li>
            `).join('');
        }
        
        // Renderizar catálogo dentro de la billetera
        const catalogGrid = document.getElementById('wallet-catalog-grid');
        if (catalogGrid) {
            catalogGrid.innerHTML = APP.data.config.catalogo.map(item => `
                <div class="catalog-item">
                    <div class="catalog-icon">${item.icon || '🎁'}</div>
                    <div class="catalog-name">${item.item}</div>
                    <div class="catalog-price">${item.costo} coins</div>
                </div>
            `).join('');
        }
    },
    renderAdminView() {
        this.renderCourseSelectors();
        this.renderAdminStudents();
        this.renderAdminCourses();
        this.renderAdminCatalog();
    },
    renderAdminStudents() {
        const tbody = document.getElementById('admin-students-body');
        const curso = Utils.getCurrentCourse();
        if (!curso) {
            tbody.innerHTML = '<tr><td colspan="4" class="empty-msg">Seleccioná un curso</td></tr>';
            return;
        }
        tbody.innerHTML = curso.estudiantes.map(est => {
            const saldo = Utils.calcularSaldo(est);
            return `
                <tr>
                    <td>${est.id}</td>
                    <td>${est.nombre}</td>
                    <td><strong>${saldo}</strong></td>
                    <td>
                        <button class="btn-danger btn-small" onclick="Admin.deleteStudent('${est.id}')">🗑️</button>
                    </td>
                </tr>
            `;
        }).join('');
        
        const selectStudent = document.getElementById('admin-student');
        if(selectStudent) selectStudent.innerHTML = curso.estudiantes.map(e => `<option value="${e.id}">${e.nombre}</option>`).join('');
    },
    renderAdminCourses() {
        const container = document.getElementById('admin-courses-list');
        if(container) {
            container.innerHTML = APP.data.cursos.map(curso => `
                <div class="course-item">
                    <span><strong>${curso.nombre}</strong> - ${curso.escuela} <span style="color: var(--text-dim)">(${curso.estudiantes.length} alumnos)</span></span>
                    <div>
                        <button class="btn-secondary btn-small" onclick="Admin.archiveCourse('${curso.id}')">📦 Archivar</button>
                        <button class="btn-danger btn-small" onclick="Admin.deleteCourse('${curso.id}')">🗑️ Eliminar</button>
                    </div>
                </div>
            `).join('');
        }
    },
    renderAdminCatalog() {
        const container = document.getElementById('admin-catalog-list');
        if(container) {
            container.innerHTML = APP.data.config.catalogo.map(item => `
                <div class="catalog-admin-item">
                    <span>${item.icon || '🎁'} <strong>${item.item}</strong> - ${item.costo} coins</span>
                    <button class="btn-danger btn-small" onclick="Admin.deleteCatalogItem(${item.id})">🗑️</button>
                </div>
            `).join('');
        }
    }
};

// ═══════════════════════════════════════════════════════
// EVENTOS
// ═══════════════════════════════════════════════════════
const Events = {
    init() {
        // Botón de admin en el header
        document.getElementById('btn-header-admin').addEventListener('click', () => {
            Navigation.switchView('admin');
        });
        // Selector de curso (vista pública)
        document.getElementById('select-course').addEventListener('change', (e) => {
            APP.state.currentCourseId = e.target.value;
            Renderer.renderRanking();
        });

        // Login alumno
        document.getElementById('login-course').addEventListener('change', () => Renderer.renderStudentLogin());
        
        document.getElementById('btn-login').addEventListener('click', () => {
            const courseId = document.getElementById('login-course').value;
            const studentId = document.getElementById('login-name').value;
            if (!courseId || !studentId) { alert('Seleccioná curso y nombre'); return; }
            const curso = APP.data.cursos.find(c => c.id === courseId);
            const estudiante = curso.estudiantes.find(e => e.id === studentId);
            APP.state.isStudentLoggedIn = true;
            APP.state.currentStudentId = studentId;
            APP.state.currentCourseId = courseId;
            document.getElementById('private-login').classList.add('hidden');
            document.getElementById('private-wallet').classList.remove('hidden');
            Renderer.renderWallet(estudiante, curso);
        });
        
        document.getElementById('btn-logout').addEventListener('click', () => {
            APP.state.isStudentLoggedIn = false;
            APP.state.currentStudentId = null;
            document.getElementById('private-login').classList.remove('hidden');
            document.getElementById('private-wallet').classList.add('hidden');
        });
        
        // Admin
        document.getElementById('btn-admin-login').addEventListener('click', () => {
            if (document.getElementById('admin-password').value === APP.state.adminPassword) {
                APP.state.isAdminLoggedIn = true;
                document.getElementById('admin-login').classList.add('hidden');
                document.getElementById('admin-panel').classList.remove('hidden');
                Renderer.renderAdminView();
            } else {
                alert('❌ Clave incorrecta');
            }
        });
        
        document.getElementById('btn-admin-logout').addEventListener('click', () => {
            APP.state.isAdminLoggedIn = false;
            document.getElementById('admin-login').classList.remove('hidden');
            document.getElementById('admin-panel').classList.add('hidden');
            document.getElementById('admin-password').value = '';
        });
        
        document.getElementById('admin-course').addEventListener('change', (e) => {
            APP.state.currentCourseId = e.target.value;
            Renderer.renderAdminStudents();
        });
        
        document.getElementById('btn-register-mov').addEventListener('click', () => Admin.registerMovement());
        document.getElementById('btn-import-excel').addEventListener('click', () => document.getElementById('file-excel').click());
        document.getElementById('file-excel').addEventListener('change', (e) => ExcelHandler.importFromFile(e.target.files[0]));
        document.getElementById('btn-export-excel').addEventListener('click', () => ExcelHandler.exportToExcel());
        document.getElementById('btn-add-student').addEventListener('click', () => Admin.addStudent());
        document.getElementById('btn-new-course').addEventListener('click', () => Admin.newCourse());
        document.getElementById('btn-add-catalog').addEventListener('click', () => Admin.addCatalogItem());
    }
};

// ═══════════════════════════════════════════════════════
// MÓDULO ADMIN
// ══════════════════════════════════════════════════════
const Admin = {
    registerMovement() {
        const studentId = document.getElementById('admin-student').value;
        const tipo = document.querySelector('input[name="mov-type"]:checked').value;
        const motivo = document.getElementById('admin-reason').value;
        const monto = parseInt(document.getElementById('admin-amount').value);
        
        if (!studentId || !monto || monto <= 0) { alert('Completá todos los campos correctamente'); return; }
        
        const curso = Utils.getCurrentCourse();
        const estudiante = curso.estudiantes.find(e => e.id === studentId);
        if (!estudiante) { alert('Estudiante no encontrado'); return; }
        
        estudiante.historial.push({ fecha: new Date().toISOString(), tipo, motivo, monto });
        Storage.save();
        Renderer.renderAdminStudents();
        alert(`✅ Movimiento registrado\n${estudiante.nombre}\nSaldo actual: ${Utils.calcularSaldo(estudiante)} coins`);
    },
    addStudent() {
        const nombre = prompt('Nombre completo del alumno (APELLIDO NOMBRE):');
        if (!nombre || nombre.trim() === '') return;
        const curso = Utils.getCurrentCourse();
        if (!curso) { alert('Seleccioná un curso primero'); return; }
        
        const maxId = curso.estudiantes.reduce((max, e) => {
            const numId = parseInt(e.id);
            return (!isNaN(numId) && numId > max) ? numId : max;
        }, 0);
        
        curso.estudiantes.push({ id: String(maxId + 1), nombre: nombre.trim().toUpperCase(), historial: [] });
        Storage.save();
        Renderer.renderAdminStudents();
    },
    deleteStudent(studentId) {
        if (!confirm('¿Eliminar este alumno? Se perderá su historial.')) return;
        const curso = Utils.getCurrentCourse();
        curso.estudiantes = curso.estudiantes.filter(e => e.id !== studentId);
        Storage.save();
        Renderer.renderAdminStudents();
    },
    newCourse() {
        const nombre = prompt('Nombre del curso (ej: 4° Año):');
        if (!nombre) return;
        const escuela = prompt('Nombre de la escuela (ej: EES 61):');
        if (!escuela) return;
        APP.data.cursos.push({ id: Utils.generateId(), nombre: nombre.trim(), escuela: escuela.trim(), anio: APP.data.config.anio, activo: true, estudiantes: [] });
        Storage.save();
        Renderer.renderAdminView();
        alert(`✅ Curso "${nombre}" creado`);
    },
    archiveCourse(courseId) {
        if (!confirm('¿Archivar este curso? No aparecerá en la vista pública.')) return;
        const curso = APP.data.cursos.find(c => c.id === courseId);
        curso.activo = false;
        Storage.save();
        Renderer.renderAdminView();
    },
    deleteCourse(courseId) {
        if (!confirm('⚠️ ¿ELIMINAR definitivamente este curso y todos sus datos?')) return;
        if (!confirm('⚠️ ÚLTIMA CONFIRMACIÓN: Esta acción no se puede deshacer')) return;
        APP.data.cursos = APP.data.cursos.filter(c => c.id !== courseId);
        Storage.save();
        Renderer.renderAdminView();
    },
    addCatalogItem() {
        const icon = prompt('Ícono (emoji, ej: 🎵):', '') || '🎁';
        const item = prompt('Nombre del ítem:');
        if (!item) return;
        const costo = parseInt(prompt('Costo en MathCoins:'));
        if (!costo || costo <= 0) { alert('Costo inválido'); return; }
        APP.data.config.catalogo.push({ id: Date.now(), icon, item: item.trim(), costo });
        Storage.save();
        Renderer.renderAdminCatalog();
        Renderer.renderCatalog();
    },
    deleteCatalogItem(itemId) {
        if (!confirm('¿Eliminar este ítem del catálogo?')) return;
        APP.data.config.catalogo = APP.data.config.catalogo.filter(i => i.id !== itemId);
        Storage.save();
        Renderer.renderAdminCatalog();
        Renderer.renderCatalog();
    }
};

// ═══════════════════════════════════════════════════════
// MANEJO DE EXCEL
// ═══════════════════════════════════════════════════════
const ExcelHandler = {
    importFromFile(file) {
        if (!file) return;
        const curso = Utils.getCurrentCourse();
        if (!curso) { alert('Seleccioná un curso primero'); return; }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
                
                let nombreColumnIndex = 1; 
                if (rows.length > 0 && Array.isArray(rows[0])) {
                    const headers = rows[0].map(h => String(h).toLowerCase().trim());
                    const foundIndex = headers.findIndex(h => h.includes('nombre') || h.includes('apellido'));
                    if (foundIndex !== -1) nombreColumnIndex = foundIndex;
                }
                
                let importados = 0;
                for (let i = 1; i < rows.length; i++) {
                    const row = rows[i];
                    if (!row || !row[nombreColumnIndex]) continue;
                    
                    const nombre = String(row[nombreColumnIndex]).trim().toUpperCase();
                    if (nombre === '') continue;
                    if (curso.estudiantes.find(e => e.nombre === nombre)) continue;
                    
                    const maxId = curso.estudiantes.reduce((max, e) => {
                        const numId = parseInt(e.id);
                        return (!isNaN(numId) && numId > max) ? numId : max;
                    }, 0);

                    curso.estudiantes.push({ id: String(maxId + 1), nombre, historial: [] });
                    importados++;
                }
                
                Storage.save();
                Renderer.renderAdminStudents();
                alert(`✅ ${importados} alumnos importados al curso ${curso.nombre}`);
            } catch (err) {
                console.error(err);
                alert('❌ Error al leer el archivo Excel: ' + err.message);
            }
        };
        reader.readAsArrayBuffer(file);
    },
    exportToExcel() {
        const curso = Utils.getCurrentCourse();
        if (!curso) { alert('Seleccioná un curso'); return; }
        
        const panelData = [['ID', 'APELLIDO Y NOMBRE', 'Total Ganados', 'Total Gastados', 'Saldo Actual']];
        curso.estudiantes.forEach(est => {
            const ganados = est.historial.filter(h => h.tipo === 'sum').reduce((s, h) => s + h.monto, 0);
            const gastados = est.historial.filter(h => h.tipo === 'sub').reduce((s, h) => s + h.monto, 0);
            panelData.push([est.id, est.nombre, ganados, gastados, ganados - gastados]);
        });
        
        const histData = [['Fecha', 'Alumno', 'Tipo', 'Motivo', 'Monto']];
        curso.estudiantes.forEach(est => {
            est.historial.forEach(h => {
                histData.push([Utils.formatDate(h.fecha), est.nombre, h.tipo === 'sum' ? 'Ingreso' : 'Gasto', h.motivo, h.monto]);
            });
        });
        
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(panelData), 'Panel_Estudiantes');
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(histData), 'Historial');
        XLSX.writeFile(wb, `MathCoins_${curso.nombre}_${curso.escuela}_${new Date().toISOString().split('T')[0]}.xlsx`);
    }
};

// ═══════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
    const loadedFromStorage = Storage.load();
    if (!loadedFromStorage || APP.data.cursos.length === 0) {
        try {
            const response = await fetch('datos.json');
            if (response.ok) {
                APP.data = await response.json();
                Storage.save();
            }
        } catch (error) {
            console.warn('No se pudo cargar datos.json');
        }
    }
    
    if (APP.data.cursos.length > 0) {
        APP.state.currentCourseId = APP.data.cursos[0].id;
    }
    
    Navigation.init();
    Events.init();
    
    // Inicia en la portada, no renderiza nada más hasta que el usuario elija
    console.log('✅ MathCoins listo - Mostrando portada de inicio');
});