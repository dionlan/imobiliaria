import { Component, EventEmitter, Output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { StatusOption } from './model/status-option';
import { FilterCriteria } from './model/filter-criteria';

@Component({
    selector: 'app-advanced-filter',
    standalone: true,
    imports: [ReactiveFormsModule, CommonModule],
    templateUrl: './advanced-filter.component.html',
})
export class AdvancedFilterComponent {
    @Output() filterChange = new EventEmitter<any>();

    form: ReturnType<FormBuilder['group']>;

    statusOptions: StatusOption[] = [
        { label: 'Ativo', value: 'ACTIVE' },
        { label: 'Inativo', value: 'INACTIVE' }
    ];

    constructor(private fb: FormBuilder) {
        this.form = this.fb.group({
            searchTerm: [''],
            status: [''],
            startDate: [null],
            endDate: [null]
        });
    }

    ngOnInit(): void {
        // Aplica debounce para o campo de busca
        this.form.get('searchTerm')?.valueChanges
            .pipe(
                debounceTime(300),
                distinctUntilChanged()
            )
            .subscribe(() => this.applyFilter());

        // Observa mudanças nos outros campos
        this.form.valueChanges
            .pipe(
                distinctUntilChanged((prev, curr) =>
                    JSON.stringify(prev) === JSON.stringify(curr)
                )
            )
            .subscribe(() => {
                if (!this.form.get('searchTerm')?.dirty) {
                    this.applyFilter();
                }
            });
    }

    applyFilter(): void {
        const formValue = this.form.value;
        const filter: FilterCriteria = {
            searchTerm: formValue.searchTerm?.trim() || undefined,
            status: formValue.status || undefined,
            startDate: formValue.startDate ? new Date(formValue.startDate) : null,
            endDate: formValue.endDate ? new Date(formValue.endDate) : null
        };

        this.filterChange.emit(filter);
    }

    resetFilter(): void {
        this.form.reset({
            searchTerm: '',
            status: '',
            startDate: null,
            endDate: null
        });
        this.filterChange.emit({});
    }
}