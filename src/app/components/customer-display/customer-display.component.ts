import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductService } from '../../services/product.service';

@Component({
  selector: 'app-customer-display',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './customer-display.component.html',
  styleUrl: './customer-display.component.css',
})
export class CustomerDisplayComponent {
  readonly productService = inject(ProductService);
}
