import { Component, EventEmitter, Output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-advanced-filter',
    standalone: true,
    imports: [ReactiveFormsModule, CommonModule],
    templateUrl: './advanced-filter.component.html',
})
export class AdvancedFilterComponent {
    @Output() filterChange = new EventEmitter<any>();

    form: ReturnType<FormBuilder['group']>;

    statusOptions = [
        { label: 'Ativo', value: 'active' },
        { label: 'Inativo', value: 'inactive' }
    ];

    constructor(private fb: FormBuilder) {
        this.form = this.fb.group({
            searchTerm: [''],
            status: [''],
            startDate: [null],
            endDate: [null]
        });
    }

    applyFilter(): void {
        this.filterChange.emit(this.form.value);
    }
    resetFilter(): void {
        this.form.reset();
        this.filterChange.emit({});
    }
}