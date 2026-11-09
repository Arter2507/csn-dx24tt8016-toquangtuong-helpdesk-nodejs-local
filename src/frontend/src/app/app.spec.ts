import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { App } from './app';
describe('App', () => {
  it('loads categories from the API', async () => {
    TestBed.configureTestingModule({ imports: [App], providers: [provideHttpClient(), provideHttpClientTesting()] });
    const fixture = TestBed.createComponent(App); fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne(req => req.url === '/api/v1/categories').flush({ success: true, data: [{ id: 1, code: 'NETWORK', name: 'Mạng', isActive: true }], meta: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 } });
    await fixture.whenStable(); fixture.detectChanges(); expect(fixture.nativeElement.textContent).toContain('Mạng'); http.verify();
  });
});
