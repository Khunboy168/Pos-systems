import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService } from '../../services/product.service';
import { Product } from '../../models/product.model';

interface ImagePreset {
  name: string;
  khmerName: string;
  url: string;
  category: string;
}

@Component({
  selector: 'app-product-table',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './product-table.component.html',
  styleUrl: './product-table.component.css',
})
export class ProductTableComponent {
  readonly productService = inject(ProductService);

  // Search & Filter state
  get searchTerm(): string {
    return this.productService.searchTerm();
  }
  set searchTerm(val: string) {
    this.productService.searchTerm.set(val);
  }

  get selectedCategory(): string {
    return this.productService.selectedCategory();
  }
  set selectedCategory(val: string) {
    this.productService.selectedCategory.set(val);
  }

  // Modals
  showAddModal = signal<boolean>(false);
  showEditModal = signal<boolean>(false);
  showDeleteModal = signal<boolean>(false);
  showImagePreviewModal = signal<boolean>(false);

  previewImage = signal<{ name: string; url: string }>({ name: '', url: '' });
  productToDelete = signal<Product | null>(null);

  // Form Model for Adding
  newProduct = {
    id: 0,
    name: '',
    khmerName: '',
    quantity: 100,
    price: 2.5,
    description: '',
    categoryName: 'Coffee',
    imageUrl: 'assets/images/coffee-latte.svg',
    isDrink: true,
  };

  // Form Model for Editing
  editProduct = {
    id: 0,
    name: '',
    khmerName: '',
    quantity: 0,
    price: 0,
    description: '',
    createdDate: '',
    categoryName: 'Coffee',
    imageUrl: '',
    isDrink: true,
  };

  readonly defaultCategories = [
    'Coffee',
    'Tea & Frappe',
    'Bakery & Snacks',
    'Food & Meals',
    'Soft drink',
    'Beer',
    'Water',
  ];

  readonly imagePresets: ImagePreset[] = [
    { name: 'Iced Cafe Latte', khmerName: 'កាហ្វេទឹកដោះគោ', url: 'assets/images/coffee-latte.svg', category: 'Coffee' },
    { name: 'Iced Americano', khmerName: 'កាហ្វេខ្មៅទឹកកក', url: 'assets/images/iced-americano.svg', category: 'Coffee' },
    { name: 'Hot Cappuccino', khmerName: 'កាពូឈីណូ', url: 'assets/images/cappuccino.svg', category: 'Coffee' },
    { name: 'Caramel Macchiato', khmerName: 'ការ៉ាមែល ម៉ាគីយ៉ាតូ', url: 'assets/images/caramel-macchiato.svg', category: 'Coffee' },
    { name: 'Khmer Coffee', khmerName: 'កាហ្វេទឹកដោះគោបុរាណ', url: 'assets/images/khmer-coffee.svg', category: 'Coffee' },
    { name: 'Matcha Green Tea', khmerName: 'តែបៃតង', url: 'assets/images/green-tea.svg', category: 'Tea & Frappe' },
    { name: 'Boba Milk Tea', khmerName: 'តែគុជ', url: 'assets/images/milk-tea.svg', category: 'Tea & Frappe' },
    { name: 'Passion Fruit Tea', khmerName: 'តែផាសិន', url: 'assets/images/passion-tea.svg', category: 'Tea & Frappe' },
    { name: 'Fresh Coconut', khmerName: 'ដូងក្រអូប', url: 'assets/images/fresh-coconut.svg', category: 'Tea & Frappe' },
    { name: 'Butter Croissant', khmerName: 'ក្រូសង់', url: 'assets/images/croissant.svg', category: 'Bakery & Snacks' },
    { name: 'Blueberry Cheesecake', khmerName: 'នំខេកឈីស', url: 'assets/images/cheesecake.svg', category: 'Bakery & Snacks' },
    { name: 'Beef Lok Lak', khmerName: 'បាយឡុកឡាក់', url: 'assets/images/lok-lak.svg', category: 'Food & Meals' },
    { name: 'Khmer Fried Rice', khmerName: 'បាយឆាសាច់មាន់', url: 'assets/images/fried-rice.svg', category: 'Food & Meals' },
    { name: 'Club Sandwich', khmerName: 'នំប៉័ងក្លឹបសាំងវិច', url: 'assets/images/club-sandwich.svg', category: 'Food & Meals' },
    { name: 'Coca Cola', khmerName: 'កូកា', url: 'assets/images/coca.svg', category: 'Soft drink' },
    { name: 'ABC Stout', khmerName: 'អេប៊ីស៊ី', url: 'assets/images/abc.svg', category: 'Beer' },
    { name: 'Cambodia Water', khmerName: 'ទឹកកម្ពុជា', url: 'assets/images/cambodia-water.svg', category: 'Water' },
    { name: 'Angkor Beer', khmerName: 'ស្រាបៀរអង្គរ', url: 'assets/images/angkor.svg', category: 'Beer' },
    { name: 'Hanuman Beer', khmerName: 'ស្រាបៀរហនុមាន', url: 'assets/images/hanuman-beer.svg', category: 'Beer' },
    { name: 'Sting Energy', khmerName: 'ស្ទីង', url: 'assets/images/sting.svg', category: 'Soft drink' },
    { name: 'Red Bull', khmerName: 'រ៉េដប៊ូល', url: 'assets/images/redbull.svg', category: 'Soft drink' },
  ];

  getCategoryClass(category: string): string {
    return 'pill-' + category.toLowerCase().replace(/[^a-z0-9]/g, '-');
  }

  openAddModal(): void {
    const list = this.productService.products();
    const nextId = list.length > 0 ? Math.max(...list.map((p) => p.id)) + 1 : 1;

    this.newProduct = {
      id: nextId,
      name: '',
      khmerName: '',
      quantity: 100,
      price: 2.5,
      description: '',
      categoryName: 'Coffee',
      imageUrl: 'assets/images/coffee-latte.svg',
      isDrink: true,
    };
    this.showAddModal.set(true);
  }

  closeAddModal(): void {
    this.showAddModal.set(false);
  }

  saveNewProduct(): void {
    if (!this.newProduct.name.trim()) return;

    this.productService.addProduct({
      id: this.newProduct.id,
      name: this.newProduct.name,
      khmerName: this.newProduct.khmerName,
      quantity: this.newProduct.quantity,
      price: this.newProduct.price,
      description: this.newProduct.description || `List product ${this.newProduct.name.toLowerCase()}`,
      createdDate: this.productService.formatCurrentDate(),
      categoryName: this.newProduct.categoryName,
      imageUrl: this.newProduct.imageUrl,
      isDrink: this.newProduct.isDrink,
    });

    this.closeAddModal();
  }

  openEditModal(product: Product): void {
    this.editProduct = {
      id: product.id,
      name: product.name,
      khmerName: product.khmerName || '',
      quantity: product.quantity,
      price: product.price,
      description: product.description,
      createdDate: product.createdDate,
      categoryName: product.categoryName,
      imageUrl: product.imageUrl,
      isDrink: product.isDrink ?? true,
    };
    this.showEditModal.set(true);
  }

  closeEditModal(): void {
    this.showEditModal.set(false);
  }

  saveEditProduct(): void {
    if (!this.editProduct.name.trim()) return;

    this.productService.updateProduct(this.editProduct.id, {
      name: this.editProduct.name,
      khmerName: this.editProduct.khmerName,
      quantity: this.editProduct.quantity,
      price: this.editProduct.price,
      description: this.editProduct.description,
      categoryName: this.editProduct.categoryName,
      imageUrl: this.editProduct.imageUrl,
      isDrink: this.editProduct.isDrink,
    });

    this.closeEditModal();
  }

  promptDelete(product: Product): void {
    this.productToDelete.set(product);
    this.showDeleteModal.set(true);
  }

  closeDeleteModal(): void {
    this.productToDelete.set(null);
    this.showDeleteModal.set(false);
  }

  confirmDelete(): void {
    const product = this.productToDelete();
    if (product) {
      this.productService.deleteProduct(product.id);
      this.closeDeleteModal();
    }
  }

  openImagePreview(product: Product): void {
    this.previewImage.set({ name: product.name, url: product.imageUrl });
    this.showImagePreviewModal.set(true);
  }

  closeImagePreview(): void {
    this.showImagePreviewModal.set(false);
  }

  resetToDefaultData(): void {
    if (confirm('Reset back to original Midterm Exam and Cambodian Coffee POS demo data?')) {
      this.productService.resetToDefault();
    }
  }

  exportCsv(): void {
    const products = this.productService.products();
    if (products.length === 0) return;

    const headers = ['ProductID', 'ProductName', 'KhmerName', 'Quantity', 'Price', 'Amount', 'Description', 'CreatedDate', 'CategoryName'];
    const rows = products.map((p) => [
      p.id,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${(p.khmerName || '').replace(/"/g, '""')}"`,
      p.quantity,
      p.price.toFixed(2),
      p.amount.toFixed(2),
      `"${p.description.replace(/"/g, '""')}"`,
      p.createdDate,
      `"${p.categoryName.replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `BrownCafe_Products_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  printList(): void {
    window.print();
  }
}
