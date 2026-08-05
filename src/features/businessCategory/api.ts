import { ENDPOINTS } from '@/constants/endpoints';
import { api } from '@/lib/api';

import type {
  BusinessCategory,
  CategoryListQuery,
  CreateCategoryRequest,
  UpdateCategoryRequest,
} from './types';

/**
 * 이름 오름차순 · 페이징 없음 — 전체를 받아 화면에서 스크롤로 보여준다.
 * 응답이 `{ categories: [...] }` 로 한 겹 더 감싸져 있어 여기서 벗겨 반환한다.
 */
export function getCategories(
  { keyword, includeDeleted }: CategoryListQuery = {},
  signal?: AbortSignal,
) {
  const params = new URLSearchParams();

  // 빈 검색어를 실어 보내면 백엔드가 빈 문자열로 검색한다
  if (keyword) params.set('keyword', keyword);
  if (includeDeleted) params.set('includeDeleted', 'true');

  const query = params.toString();

  return api
    .get<{ categories: BusinessCategory[] }>(
      query
        ? `${ENDPOINTS.businessCategories.root}?${query}`
        : ENDPOINTS.businessCategories.root,
      signal,
    )
    .then((data) => data.categories);
}

export function createCategory(body: CreateCategoryRequest) {
  return api.post<BusinessCategory>(ENDPOINTS.businessCategories.root, body);
}

export function updateCategory(
  categoryId: number,
  body: UpdateCategoryRequest,
) {
  return api.patch<BusinessCategory>(
    ENDPOINTS.businessCategories.detail(categoryId),
    body,
  );
}

/** 논리 삭제. 연결된 프로젝트가 있으면 409 `BUSINESS_CATEGORY_IN_USE` */
export function deleteCategory(categoryId: number) {
  return api.delete<void>(ENDPOINTS.businessCategories.detail(categoryId));
}
