import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Property } from '../../../../models/property.model';

@Component({
    selector: 'app-property-selector',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './property-selector.component.html',
    styleUrls: ['./property-selector.component.scss']
})
export class PropertySelectorComponent {
    @Input() campaignId!: number;
    @Input() properties: Property[] = [];
    @Input() isLoading = false;
    @Input() disabled = false;
    @Input() selectedPropertyId: number | null = null;
    @Output() propertySelected = new EventEmitter<{ campaignId: number; propertyId: number }>();

    isDropdownOpen = false;

    get selectedPropertyName(): string {
        if (!this.selectedPropertyId) return 'Selecione um empreendimento';
        console.log('EMPREENDIMENTOS SELETOR: ', this.properties);
        const found = this.properties.find(p => p.id === this.selectedPropertyId);
        return found?.name || 'Empreendimento não encontrado';
    }

    onPropertySelected(): void {
        if (this.selectedPropertyId) {
            this.propertySelected.emit({
                campaignId: this.campaignId,
                propertyId: this.selectedPropertyId
            });
            this.selectedPropertyId = null;
            this.isDropdownOpen = false;
        }
    }

    toggleDropdown(): void {
        if (!this.disabled && !this.isLoading) {
            this.isDropdownOpen = !this.isDropdownOpen;
        }
    }

    selectProperty(property: Property): void {
        this.selectedPropertyId = property.id;
        this.onPropertySelected();
    }
}