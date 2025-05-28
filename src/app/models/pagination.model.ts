// pagination.model.ts
export interface Pagination {
    page: number;         // Página atual
    pageSize: number;     // Itens por página
    totalRecords: number; // Total de registros
    totalPages?: number;  // Total de páginas (calculado)
}

// Métodos úteis que podem ser adicionados como funções auxiliares
export function getPaginationOffset(pagination: Pagination): number {
    return (pagination.page - 1) * pagination.pageSize;
}

export function calculateTotalPages(pagination: Pagination): number {
    return Math.ceil(pagination.totalRecords / pagination.pageSize);
}