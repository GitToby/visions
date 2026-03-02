/**
 * AUTO-GENERATED — do not hand-edit.
 * Run `bun run generate:api` with the backend running to regenerate.
 *
 * This placeholder reflects the current backend models. It will be
 * overwritten with the fully-accurate generated output once the backend is live.
 */

export interface paths {
  "/auth/login": {
    get: {
      parameters: { query?: never; path?: never };
      requestBody?: never;
      responses: {
        200: { content: { "application/json": { url: string } } };
      };
    };
  };
  "/auth/callback": {
    get: {
      parameters: { query: { code: string }; path?: never };
      requestBody?: never;
      responses: {
        200: {
          content: {
            "application/json": components["schemas"]["UserResponse"];
          };
        };
      };
    };
  };
  "/auth/me": {
    get: {
      parameters: { query?: never; path?: never };
      requestBody?: never;
      responses: {
        200: {
          content: {
            "application/json": components["schemas"]["UserResponse"];
          };
        };
        401: { content: { "application/json": { detail: string } } };
      };
    };
  };
  "/auth/logout": {
    post: {
      parameters: { query?: never; path?: never };
      requestBody?: never;
      responses: {
        204: { content: never };
      };
    };
  };
  "/houses": {
    get: {
      parameters: { query?: never; path?: never };
      requestBody?: never;
      responses: {
        200: {
          content: {
            "application/json": components["schemas"]["HouseResponse"][];
          };
        };
      };
    };
    post: {
      parameters: { query?: never; path?: never };
      requestBody: {
        content: {
          "application/json": components["schemas"]["HouseCreateRequest"];
        };
      };
      responses: {
        201: {
          content: {
            "application/json": components["schemas"]["HouseResponse"];
          };
        };
      };
    };
  };
  "/houses/{house_id}": {
    get: {
      parameters: { query?: never; path: { house_id: string } };
      requestBody?: never;
      responses: {
        200: {
          content: {
            "application/json": components["schemas"]["HouseDetailResponse"];
          };
        };
        404: { content: { "application/json": { detail: string } } };
      };
    };
    delete: {
      parameters: { query?: never; path: { house_id: string } };
      requestBody?: never;
      responses: {
        204: { content: never };
        404: { content: { "application/json": { detail: string } } };
      };
    };
  };
  "/houses/{house_id}/rooms": {
    post: {
      parameters: { query?: never; path: { house_id: string } };
      requestBody: {
        content: { "multipart/form-data": { image: Blob; label?: string } };
      };
      responses: {
        201: {
          content: {
            "application/json": components["schemas"]["RoomResponse"];
          };
        };
      };
    };
  };
  "/styles": {
    get: {
      parameters: { query?: never; path?: never };
      requestBody?: never;
      responses: {
        200: {
          content: {
            "application/json": components["schemas"]["StyleResponse"][];
          };
        };
      };
    };
    post: {
      parameters: { query?: never; path?: never };
      requestBody: {
        content: {
          "multipart/form-data": {
            name: string;
            description: string;
            preview_image?: Blob;
          };
        };
      };
      responses: {
        201: {
          content: {
            "application/json": components["schemas"]["StyleResponse"];
          };
        };
      };
    };
  };
  "/styles/{style_id}": {
    delete: {
      parameters: { query?: never; path: { style_id: string } };
      requestBody?: never;
      responses: {
        204: { content: never };
      };
    };
  };
  "/generation": {
    post: {
      parameters: { query?: never; path?: never };
      requestBody: {
        content: {
          "application/json": components["schemas"]["GenerationRequest"];
        };
      };
      responses: {
        202: {
          content: {
            "application/json": components["schemas"]["GenerationJobResponse"][];
          };
        };
      };
    };
  };
  "/generation/houses/{house_id}": {
    get: {
      parameters: { query?: never; path: { house_id: string } };
      requestBody?: never;
      responses: {
        200: {
          content: {
            "application/json": components["schemas"]["GenerationJobResponse"][];
          };
        };
      };
    };
  };
  "/generation/jobs/{job_id}": {
    get: {
      parameters: { query?: never; path: { job_id: string } };
      requestBody?: never;
      responses: {
        200: {
          content: {
            "application/json": components["schemas"]["GenerationJobResponse"];
          };
        };
      };
    };
  };
}

export interface components {
  schemas: {
    UserResponse: {
      id: string;
      email: string;
      name: string;
      picture: string | null;
      created_at: string;
    };
    HouseCreateRequest: {
      name: string;
    };
    HouseResponse: {
      id: string;
      name: string;
      owner_id: string;
      created_at: string;
      updated_at: string;
      room_count: number;
    };
    RoomResponse: {
      id: string;
      house_id: string;
      label: string;
      original_image_url: string;
      created_at: string;
    };
    HouseDetailResponse: {
      id: string;
      name: string;
      owner_id: string;
      created_at: string;
      updated_at: string;
      room_count: number;
      rooms: components["schemas"]["RoomResponse"][];
    };
    StyleResponse: {
      id: string;
      name: string;
      description: string;
      preview_image_url: string | null;
      is_builtin: boolean;
      creator_id: string | null;
      created_at: string;
    };
    GenerationRequest: {
      house_id: string;
      room_ids: string[];
      style_ids: string[];
    };
    GenerationJobResponse: {
      id: string;
      room_id: string;
      style_id: string;
      status: "pending" | "processing" | "completed" | "failed";
      result_image_url: string | null;
      error_message: string | null;
      created_at: string;
      completed_at: string | null;
    };
  };
}
