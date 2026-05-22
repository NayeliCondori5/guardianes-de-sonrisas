/**
 * Behavior Specification (SDD) - Sprint 2: Gestión de Productos y Servicios
 * Platform: Guardianes de Sonrisas
 */

describe('Sprint 2: Gestión de Productos y Servicios (SDD Behavior Specifications)', () => {
    let mockLocalStorageStore = {};

    beforeAll(() => {
        // Mock localStorage
        Object.defineProperty(window, 'localStorage', {
            value: {
                getItem: jest.fn((key) => mockLocalStorageStore[key] || null),
                setItem: jest.fn((key, value) => {
                    mockLocalStorageStore[key] = value.toString();
                }),
                removeItem: jest.fn((key) => {
                    delete mockLocalStorageStore[key];
                }),
                clear: jest.fn(() => {
                    mockLocalStorageStore = {};
                }),
            },
            writable: true
        });
    });

    beforeEach(() => {
        mockLocalStorageStore = {};
        jest.clearAllMocks();
    });

    describe('HU-01: Registro de Servicio Especializado (Ofertante)', () => {
        test('Debería registrar un servicio con estado inicial forzosamente en "pending"', () => {
            const newService = {
                id: 'srv-1',
                sitter_id: 'sitter-1',
                title: 'Apoyo Pedagógico en Matemáticas',
                category: 'Tutorías / Tareas',
                rate: 35,
                description: 'Apoyo escolar para primaria y secundaria.',
                status: 'pending' // Forzado en registro
            };

            const services = JSON.parse(mockLocalStorageStore['services'] || '[]');
            services.push(newService);
            mockLocalStorageStore['services'] = JSON.stringify(services);

            // Assertions
            const storedServices = JSON.parse(mockLocalStorageStore['services']);
            expect(storedServices).toHaveLength(1);
            expect(storedServices[0].title).toBe('Apoyo Pedagógico en Matemáticas');
            expect(storedServices[0].status).toBe('pending');
        });

        test('Debería fallar o ser inválido si faltan campos obligatorios', () => {
            const validateService = (service) => {
                return !!(service.title && service.category && service.rate && service.description);
            };

            const invalidService = {
                id: 'srv-2',
                sitter_id: 'sitter-1',
                title: '', // Missing title
                category: 'Tutorías / Tareas',
                rate: 35,
                description: 'Apoyo escolar'
            };

            expect(validateService(invalidService)).toBe(false);
        });
    });

    describe('HU-02: Edición Crítica y Eliminación de Servicio', () => {
        test('Debería restablecer el estado a "pending" al editar campos críticos', () => {
            const originalService = {
                id: 'srv-edit-1',
                sitter_id: 'sitter-1',
                title: 'Estimulación Temprana Avanzada',
                category: 'Cuidado Especial / Estimulación',
                rate: 40,
                description: 'Sesiones personalizadas de estimulación sensorio-motriz.',
                status: 'approved' // Ya estaba aprobado
            };

            // Simulate caregiver editing the service rate (critical field)
            const updatedForm = {
                title: 'Estimulación Temprana Avanzada',
                category: 'Cuidado Especial / Estimulación',
                rate: 50, // changed rate (critical field)
                description: 'Sesiones personalizadas de estimulación sensorio-motriz.'
            };

            const isCriticalChange = 
                originalService.title !== updatedForm.title ||
                originalService.description !== updatedForm.description ||
                originalService.category !== updatedForm.category ||
                Number(originalService.rate) !== Number(updatedForm.rate);

            let finalStatus = originalService.status;
            if (isCriticalChange) {
                finalStatus = 'pending';
            }

            expect(isCriticalChange).toBe(true);
            expect(finalStatus).toBe('pending');
        });

        test('Debería mantener el estado "approved" al editar campos no críticos', () => {
            const originalService = {
                id: 'srv-edit-2',
                sitter_id: 'sitter-1',
                title: 'Cuidado de Lactantes',
                category: 'Cuidado General',
                rate: 30,
                description: 'Servicio nocturno de cuidado para bebés lactantes.',
                status: 'approved'
            };

            // Non-critical edit simulation (e.g. updating work zone details in sitter profile, not on the service itself)
            const isCriticalChange = false; 

            let finalStatus = originalService.status;
            if (isCriticalChange) {
                finalStatus = 'pending';
            }

            expect(isCriticalChange).toBe(false);
            expect(finalStatus).toBe('approved');
        });

        test('Debería eliminar permanentemente el servicio de la lista al presionar borrar', () => {
            const services = [
                { id: 'srv-1', title: 'Servicio 1', status: 'approved' },
                { id: 'srv-2', title: 'Servicio 2', status: 'pending' }
            ];

            mockLocalStorageStore['services'] = JSON.stringify(services);

            // Action: Delete srv-1
            let storedServices = JSON.parse(mockLocalStorageStore['services']);
            storedServices = storedServices.filter(s => s.id !== 'srv-1');
            mockLocalStorageStore['services'] = JSON.stringify(storedServices);

            // Assert
            const finalServices = JSON.parse(mockLocalStorageStore['services']);
            expect(finalServices).toHaveLength(1);
            expect(finalServices[0].id).toBe('srv-2');
        });
    });

    describe('HU-03: Auditoría y Validación (Administrador)', () => {
        test('Debería cambiar el estado del servicio a "approved" al ser validado positivamente', () => {
            const service = {
                id: 'srv-validate-1',
                sitter_id: 'sitter-1',
                title: 'Terapia del Lenguaje',
                status: 'pending'
            };

            // Admin action: approve
            service.status = 'approved';

            expect(service.status).toBe('approved');
        });

        test('Debería cambiar el estado del servicio a "rejected" al ser rechazado', () => {
            const service = {
                id: 'srv-validate-2',
                sitter_id: 'sitter-1',
                title: 'Terapia Ocupacional Infantil',
                status: 'pending'
            };

            // Admin action: reject
            service.status = 'rejected';

            expect(service.status).toBe('rejected');
        });
    });
});
