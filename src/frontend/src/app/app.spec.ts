import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { App } from './app';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from './app.routes';
describe('App', () => {
  it('opens a category edit URL and loads only the selected category', async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter(routes, withComponentInputBinding()), provideHttpClient(), provideHttpClientTesting()],
    });
    const harness = await RouterTestingHarness.create('/categories/3/edit');
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/v1/categories/3').flush({
      success: true, data: { id: 3, code: 'NETWORK', name: 'Mạng', isActive: true }, meta: null,
    });
    harness.detectChanges();
    await harness.fixture.whenStable();
    expect(harness.routeNativeElement?.querySelector<HTMLInputElement>('input[name="name"]')?.value).toBe('Mạng');
    http.verify();
  });

  it('loads categories from the API', async () => {
    TestBed.configureTestingModule({ imports: [App], providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
    const fixture = TestBed.createComponent(App); fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne(req => req.url === '/api/v1/categories').flush({ success: true, data: [{ id: 1, code: 'NETWORK', name: 'Mạng', isActive: true }], meta: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 } });
    await fixture.whenStable(); fixture.detectChanges(); expect(fixture.nativeElement.textContent).toContain('Mạng'); http.verify();
  });
});
