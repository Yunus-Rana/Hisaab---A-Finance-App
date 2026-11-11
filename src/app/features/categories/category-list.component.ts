import { Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Category } from '../../data/models/category.model';
import { TRACKER_REPOSITORY } from '../../data/repositories/tracker-repository.token';

@Component({
  imports: [ReactiveFormsModule],
  selector: 'app-category-list',
  templateUrl: './category-list.component.html',
  styleUrl: './category-list.component.css',
})
export class CategoryListComponent implements OnInit {
  private readonly repository = inject(TRACKER_REPOSITORY);

  readonly categories = signal<Category[]>([]);
  readonly editingId = signal<string | null>(null);
  readonly isLoading = signal(true);
  readonly isSaving = signal(false);
  readonly errorMessage = signal('');
  readonly form = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(80)],
    }),
  });

  async ngOnInit(): Promise<void> {
    await this.loadCategories();
  }

  async saveCategory(): Promise<void> {
    this.errorMessage.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const name = this.form.controls.name.value.trim();
    this.isSaving.set(true);
    try {
      const id = this.editingId();
      if (id) {
        await this.repository.renameCategory(id, name);
      } else {
        await this.repository.createCategory({ name });
      }
      this.cancelEdit();
      await this.loadCategories();
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error ? error.message : 'Could not save this category.',
      );
    } finally {
      this.isSaving.set(false);
    }
  }

  editCategory(category: Category): void {
    this.editingId.set(category.id);
    this.form.setValue({ name: category.name });
    this.errorMessage.set('');
  }

  async deleteCategory(category: Category): Promise<void> {
    if (!globalThis.confirm(`Delete the ${category.name} category?`)) {
      return;
    }
    try {
      await this.repository.deleteCategory(category.id);
      if (this.editingId() === category.id) {
        this.cancelEdit();
      }
      await this.loadCategories();
      this.errorMessage.set('');
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error ? error.message : 'Could not delete this category.',
      );
    }
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.form.reset({ name: '' });
  }

  private async loadCategories(): Promise<void> {
    this.isLoading.set(true);
    try {
      this.categories.set(await this.repository.listCategories());
      this.errorMessage.set('');
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Could not load categories.');
    } finally {
      this.isLoading.set(false);
    }
  }
}
