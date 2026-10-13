/* ═══════════════════════════════════════════════════════ */
/* MATHCOINS - APP.JS                                      */
/* Sistema de gamificación educativa                       */
/* ═══════════════════════════════════════════════════════ */

// ═══════════════════════════════════════════════════════
// ESTADO GLOBAL DE LA APLICACIÓN
// ══════════════════════════════════════════════════════
const APP = {
    // Datos principales
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
    
    // Estado de la UI
    state: {
        currentView: 'public',
        currentCourseId: null,
        isAdminLoggedIn: false,
        isStudentLoggedIn: false,
        currentStudentId: null,
        adminPassword: 'profe' // ⚠️ Cambiar en producción
    }
};

// ═══════════════════════════════════════════════════════
// PERSISTENCIA (localStorage)
// ═══════════════════════════════════════════════════════
const Storage = {
    KEY: 'mathcoins_data',
    
    save() {
        localStorage.setItem(this.KEY, JSON.stringify(APP.data));
        console.log('✅ Datos guardados en localStorage');
    },
    
    load() {
        const saved = localStorage.getItem(this.KEY);
        if (saved) {
            try {
                APP.data = JSON.parse(saved);
                console.log('✅ Datos cargados desde localStorage');
                return true;
            } catch (e) {
                console.error('❌ Error al cargar datos:', e);
                return false;
            }
        }
        return false;
    },
    
    clear() {
        localStorage.removeItem(this.KEY);
    }
};

// ═══════════════════════════════════════════════════════
// UTILIDADES
// ═══════════════════════════════════════════════════════
const Utils = {
    // Calcula el nivel según el saldo
    getNivel(saldo) {
        if (saldo >= 50) return { nombre: '💎 Maestro', color: '#60a5fa' };
        if (saldo >= 25) return { nombre: '🌟 Experto', color: '#fbbf24' };
        if (saldo >= 10) return { nombre: '⭐ Aprendiz', color: '#10b981' };
        return { nombre: '🔰 Novato', color: '#9ca3af' };
    },
    
    // Genera un ID único (se mantiene por compatibilidad, pero addStudent usa secuencial)
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },
    
    // Formatea fecha
    formatDate(dateStr) {
        const d = new Date(dateStr);
        return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
    },
    
    // Obtiene el curso actual
    getCurrentCourse() {
        return APP.data.cursos.find(c => c.id === APP.state.currentCourseId);
    },
    
    // Obtiene un estudiante de un curso
    getStudent(courseId, studentId) {
        const course = APP.data.cursos.find(c => c.id === courseId);
        return course ? course.estudiantes.find(e => e.id === studentId) : null;
    },
    
    // Calcula el saldo de un estudiante
    calcularSaldo(estudiante) {
        const ganados = estudiante.historial
            .filter(h => h.tipo === 'sum')
            .reduce((sum, h) => sum + h.monto, 0);
        const gastados = estudiante.historial
            .filter(h => h.tipo === 'sub')
            .reduce((sum, h) => sum + h.monto, 0);
        return ganados - gastados;
    }
};

// ══════════════════════════════════════════════════════
// NAVEGACIÓN ENTRE VISTAS
// ═══════════════════════════════════════════════════════
const Navigation = {
    init() {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => this.switchView(btn.dataset.view));
        });
    },
    
    switchView(viewName) {
        // Ocultar todas las vistas
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        
        // Mostrar la vista seleccionada
        document.getElementById(`view-${viewName}`).classList.add('active');
        document.querySelector(`[data-view="${viewName}"]`).classList.add('active');
        
        APP.state.currentView = viewName;
        
        // Renderizar según la vista
        if (viewName === 'public') Renderer.renderPublicView();
        if (viewName === 'admin' && APP.state.isAdminLoggedIn) Renderer.renderAdminView();
    }
};

// ═══════════════════════════════════════════════════════
// RENDERIZADO DE VISTAS
// ═══════════════════════════════════════════════════════
const Renderer = {
    // ─────────────────────────────────────────────────
    // VISTA PÚBLICA
    // ─────────────────────────────────────────────────
    renderCourseSelectors() {
        const selects = ['select-course', 'login-course', 'admin-course'];
        selects.forEach(id => {
            const select = document.getElementById(id);
            if (!select) return;
            
            const currentValue = select.value;
            select.innerHTML = '<option value="">-- Seleccioná un curso --</option>';
            
            APP.data.cursos
                .filter(c => c.activo !== false)
                .forEach(curso => {
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
        
        // Ordenar estudiantes por saldo (descendente)
        const ranking = [...curso.estudiantes]
            .map(e => ({ ...e, saldo: Utils.calcularSaldo(e) }))
            .sort((a, b) => b.saldo - a.saldo);
        
        if (ranking.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="empty-msg">No hay alumnos en este curso</td></tr>';
            return;
        }
        
        tbody.innerHTML = ranking.map((est, i) => {
            const nivel = Utils.getNivel(est.saldo);
            const posicion = i === 0 ? '' : i === 1 ? '' : i === 2 ? '🥉' : (i + 1);
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
        grid.innerHTML = APP.data.config.catalogo.map(item => `
            <div class="catalog-item">
                <div class="catalog-icon">${item.icon || '🎁'}</div>
                <div class="catalog-name">${item.item}</div>
                <div class="catalog-price">${item.costo} coins</div>
            </div>
        `).join('');
    },
    
    // ─────────────────────────────────────────────────
    // VISTA PRIVADA (ALUMNO)
    // ─────────────────────────────────────────────────
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
        
        document.getElementById('wallet-student-name').textContent = 
            `${estudiante.nombre} · ${curso.nombre}`;
        document.getElementById('wallet-balance').textContent = saldo;
        document.getElementById('wallet-level').textContent = nivel.nombre;
        document.getElementById('wallet-level').style.color = nivel.color;
        
        // Historial
        const historyList = document.getElementById('wallet-history');
        if (estudiante.historial.length === 0) {
            historyList.innerHTML = '<li class="empty-msg">Sin movimientos registrados</li>';
        } else {
            historyList.innerHTML = estudiante.historial
                .slice()
                .reverse()
                .map(h => `
                    <li>
                        <span>${Utils.formatDate(h.fecha)} · ${h.motivo}</span>
                        <span class="${h.tipo === 'sum' ? 'history-positive' : 'history-negative'}">
                            ${h.tipo === 'sum' ? '+' : '-'}${h.monto}
                        </span>
                    </li>
                `).join('');
        }
    },
    
    // ─────────────────────────────────────────────────
    // VISTA ADMIN
    // ─────────────────────────────────────────────────
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
                        <button class="btn-danger btn-small" onclick="Admin.deleteStudent('${est.id}')">
                            🗑️ Eliminar
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
        
        // Actualizar selector de alumnos en el formulario
        const selectStudent = document.getElementById('admin-student');
        selectStudent.innerHTML = curso.estudiantes.map(e => 
            `<option value="${e.id}">${e.nombre}</option>`
        ).join('');
    },
    
    renderAdminCourses() {
        const container = document.getElementById('admin-courses-list');
        container.innerHTML = APP.data.cursos.map(curso => `
            <div class="course-item">
                <span>
                    <strong>${curso.nombre}</strong> - ${curso.escuela}
                    <span style="color: var(--text-dim)">(${curso.estudiantes.length} alumnos)</span>
                </span>
                <div>
                    <button class="btn-secondary btn-small" onclick="Admin.archiveCourse('${curso.id}')">
                        📦 Archivar
                    </button>
                    <button class="btn-danger btn-small" onclick="Admin.deleteCourse('${curso.id}')">
                        🗑️ Eliminar
                    </button>
                </div>
            </div>
        `).join('');
    },
    
    renderAdminCatalog() {
        const container = document.getElementById('admin-catalog-list');
        container.innerHTML = APP.data.config.catalogo.map(item => `
            <div class="catalog-admin-item">
                <span>${item.icon || '🎁'} <strong>${item.item}</strong> - ${item.costo} coins</span>
                <button class="btn-danger btn-small" onclick="Admin.deleteCatalogItem(${item.id})">
                    🗑️
                </button>
            </div>
        `).join('');
    }
};

// ═══════════════════════════════════════════════════════
// EVENTOS PRINCIPALES
// ═══════════════════════════════════════════════════════
const Events = {
    init() {
        // Selector de curso (vista pública)
        document.getElementById('select-course').addEventListener('change', (e) => {
            APP.state.currentCourseId = e.target.value;
            Renderer.renderRanking();
        });
        
        // Login alumno
        document.getElementById('login-course').addEventListener('change', () => {
            Renderer.renderStudentLogin();
        });
        
        document.getElementById('btn-login').addEventListener('click', () => {
            const courseId = document.getElementById('login-course').value;
            const studentId = document.getElementById('login-name').value;
            
            if (!courseId || !studentId) {
                alert('Seleccioná curso y nombre');
                return;
            }
            
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
        
        // Admin login
        document.getElementById('btn-admin-login').addEventListener('click', () => {
            const pass = document.getElementById('admin-password').value;
            if (pass === APP.state.adminPassword) {
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
        
        // Selector de curso (admin)
        document.getElementById('admin-course').addEventListener('change', (e) => {
            APP.state.currentCourseId = e.target.value;
            Renderer.renderAdminStudents();
        });
        
        // Registrar movimiento
        document.getElementById('btn-register-mov').addEventListener('click', () => {
            Admin.registerMovement();
        });
        
        // Importar/Exportar Excel
        document.getElementById('btn-import-excel').addEventListener('click', () => {
            document.getElementById('file-excel').click();
        });
        
        document.getElementById('file-excel').addEventListener('change', (e) => {
            ExcelHandler.importFromFile(e.target.files[0]);
        });
        
        document.getElementById('btn-export-excel').addEventListener('click', () => {
            ExcelHandler.exportToExcel();
        });
        
        // Agregar alumno
        document.getElementById('btn-add-student').addEventListener('click', () => {
            Admin.addStudent();
        });
        
        // Nuevo curso
        document.getElementById('btn-new-course').addEventListener('click', () => {
            Admin.newCourse();
        });
        
        // Agregar ítem catálogo
        document.getElementById('btn-add-catalog').addEventListener('click', () => {
            Admin.addCatalogItem();
        });
    }
};

// ═══════════════════════════════════════════════════════
// MÓDULO ADMIN
// ═══════════════════════════════════════════════════════
const Admin = {
    registerMovement() {
        const studentId = document.getElementById('admin-student').value;
        const tipo = document.querySelector('input[name="mov-type"]:checked').value;
        const motivo = document.getElementById('admin-reason').value;
        const monto = parseInt(document.getElementById('admin-amount').value);
        
        if (!studentId || !monto || monto <= 0) {
            alert('Completá todos los campos correctamente');
            return;
        }
        
        const curso = Utils.getCurrentCourse();
        const estudiante = curso.estudiantes.find(e => e.id === studentId);
        
        if (!estudiante) {
            alert('Estudiante no encontrado');
            return;
        }
        
        // Agregar al historial
        estudiante.historial.push({
            fecha: new Date().toISOString(),
            tipo: tipo,
            motivo: motivo,
            monto: monto
        });
        
        Storage.save();
        Renderer.renderAdminStudents();
        
        const saldo = Utils.calcularSaldo(estudiante);
        alert(`✅ Movimiento registrado\n${estudiante.nombre}\nSaldo actual: ${saldo} coins`);
    },
    
    addStudent() {
        const nombre = prompt('Nombre completo del alumno (APELLIDO NOMBRE):');
        if (!nombre || nombre.trim() === '') return;
        
        const curso = Utils.getCurrentCourse();
        if (!curso) {
            alert('Seleccioná un curso primero');
            return;
        }
        
        // Calcular el siguiente ID secuencial
        const maxId = curso.estudiantes.reduce((max, e) => {
            const numId = parseInt(e.id);
            return (!isNaN(numId) && numId > max) ? numId : max;
        }, 0);
        const newId = String(maxId + 1);

        curso.estudiantes.push({
            id: newId,
            nombre: nombre.trim().toUpperCase(),
            historial: []
        });
        
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
        
        const newId = Utils.generateId();
        APP.data.cursos.push({
            id: newId,
            nombre: nombre.trim(),
            escuela: escuela.trim(),
            anio: APP.data.config.anio,
            activo: true,
            estudiantes: []
        });
        
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
        if (!costo || costo <= 0) {
            alert('Costo inválido');
            return;
        }
        
        APP.data.config.catalogo.push({
            id: Date.now(),
            icon: icon,
            item: item.trim(),
            costo: costo
        });
        
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
// MANEJO DE EXCEL (usando SheetJS)
// ═══════════════════════════════════════════════════════
const ExcelHandler = {
    importFromFile(file) {
        if (!file) return;
        
        const curso = Utils.getCurrentCourse();
        if (!curso) {
            alert('Seleccioná un curso primero');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                
                // Leer la primera hoja (Panel_Estudiantes)
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
                
                // Saltar encabezados y procesar
                let importados = 0;
                for (let i = 1; i < rows.length; i++) {
                    const row = rows[i];
                    if (!row || !row[1]) continue; // Sin nombre
                    
                    const nombre = String(row[1]).trim().toUpperCase();
                    if (nombre === '') continue;
                    
                    // Verificar si ya existe
                    const existe = curso.estudiantes.find(e => e.nombre === nombre);
                    if (existe) continue;
                    
                    // Calcular ID secuencial para los importados también
                    const maxId = curso.estudiantes.reduce((max, e) => {
                        const numId = parseInt(e.id);
                        return (!isNaN(numId) && numId > max) ? numId : max;
                    }, 0);

                    curso.estudiantes.push({
                        id: String(maxId + 1),
                        nombre: nombre,
                        historial: []
                    });
                    importados++;
                }
                
                Storage.save();
                Renderer.renderAdminStudents();
                alert(`✅ ${importados} alumnos importados al curso ${curso.nombre}`);
                
            } catch (err) {
                console.error(err);
                alert('❌ Error al leer el archivo Excel');
            }
        };
        reader.readAsArrayBuffer(file);
    },
    
    exportToExcel() {
        const curso = Utils.getCurrentCourse();
        if (!curso) {
            alert('Seleccioná un curso');
            return;
        }
        
        // Hoja 1: Panel de estudiantes
        const panelData = [
            ['ID', 'APELLIDO Y NOMBRE', 'Total Ganados', 'Total Gastados', 'Saldo Actual']
        ];
        
        curso.estudiantes.forEach(est => {
            const ganados = est.historial.filter(h => h.tipo === 'sum').reduce((s, h) => s + h.monto, 0);
            const gastados = est.historial.filter(h => h.tipo === 'sub').reduce((s, h) => s + h.monto, 0);
            panelData.push([est.id, est.nombre, ganados, gastados, ganados - gastados]);
        });
        
        // Hoja 2: Historial completo
        const histData = [['Fecha', 'Alumno', 'Tipo', 'Motivo', 'Monto']];
        curso.estudiantes.forEach(est => {
            est.historial.forEach(h => {
                histData.push([
                    Utils.formatDate(h.fecha),
                    est.nombre,
                    h.tipo === 'sum' ? 'Ingreso' : 'Gasto',
                    h.motivo,
                    h.monto
                ]);
            });
        });
        
        // Crear workbook
        const wb = XLSX.utils.book_new();
        const ws1 = XLSX.utils.aoa_to_sheet(panelData);
        const ws2 = XLSX.utils.aoa_to_sheet(histData);
        
        XLSX.utils.book_append_sheet(wb, ws1, 'Panel_Estudiantes');
        XLSX.utils.book_append_sheet(wb, ws2, 'Historial');
        
        // Descargar
        const filename = `MathCoins_${curso.nombre}_${curso.escuela}_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, filename);
    }
};

// ═══════════════════════════════════════════════════════
// CARGAR DATOS DESDE JSON EXTERNO
// ═══════════════════════════════════════════════════════
async function cargarDatosIniciales() {
    try {
        const response = await fetch('datos.json');
        if (!response.ok) throw new Error('No se pudo cargar datos.json');
        
        const datosExternos = await response.json();
        APP.data = datosExternos;
        
        console.log('✅ Datos cargados desde datos.json');
        return true;
    } catch (error) {
        console.warn('⚠️ No se pudo cargar datos.json, usando localStorage o datos por defecto');
        return false;
    }
}

// ═══════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 MathCoins iniciando...');
    
    // Intentar cargar desde localStorage primero
    const loadedFromStorage = Storage.load();
    
    // Si no hay datos en localStorage, intentar cargar desde JSON
    if (!loadedFromStorage || APP.data.cursos.length === 0) {
        const loadedFromJson = await cargarDatosIniciales();
        
        if (loadedFromJson) {
            Storage.save(); // Guardar en localStorage para uso futuro
        }
    }
    
    // Seleccionar el primer curso por defecto
    if (APP.data.cursos.length > 0) {
        APP.state.currentCourseId = APP.data.cursos[0].id;
    }
    
    // Inicializar módulos
    Navigation.init();
    Events.init();
    Renderer.renderPublicView();
    
    console.log('✅ MathCoins listo');
});